package com.example.synapse.controller;

import com.example.synapse.entity.FileEntity;
import com.example.synapse.entity.SharedFolder;
import com.example.synapse.entity.User;
import com.example.synapse.repository.FileRepository;
import com.example.synapse.repository.SharedFolderRepository;
import com.example.synapse.repository.UserRepository;
import com.example.synapse.service.PythonRunner;
import com.example.synapse.service.S3Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import java.io.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired private FileRepository fileRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SharedFolderRepository sharedFolderRepository;
    @Autowired private S3Service s3Service;

    private boolean hasAccessToFolder(User user, SharedFolder folder) {
        return folder.getSharedUsers().contains(user) || folder.getOwner().equals(user);
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId,
            @RequestParam(value = "overwrite", defaultValue = "false") boolean overwrite,
            @RequestParam(value = "analyze", defaultValue = "true") boolean analyze,  // 추가!
            HttpSession session) throws IOException {

        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 필요");

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("사용자 없음");

        String originalName = StringUtils.cleanPath(file.getOriginalFilename());
        String s3Key = (folderId != null ? "shared_" + folderId : "user_" + userId) + "/" + originalName;

        SharedFolder folder = null;
        if (folderId != null) {
            folder = sharedFolderRepository.findById(folderId).orElse(null);
            if (folder == null || !hasAccessToFolder(user, folder)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("공유 폴더 접근 권한 없음");
            }
        }

        FileEntity existing = (folder != null)
                ? fileRepository.findByFilenameAndSharedFolder_Id(originalName, folderId).orElse(null)
                : fileRepository.findByFilenameAndUser_UserIdAndSharedFolderIsNull(originalName, userId).orElse(null);

        if (existing != null) {
            if (!overwrite) return ResponseEntity.status(HttpStatus.CONFLICT).body("파일 존재함. 덮어쓰기?");
            s3Service.deleteFile(existing.getFilepath());
            fileRepository.delete(existing);
        }

        s3Service.uploadFile(file, s3Key);

        FileEntity entity = new FileEntity();
        entity.setFilename(originalName);
        entity.setFilepath(s3Key);
        entity.setSize(file.getSize());
        entity.setMimetype(file.getContentType());
        entity.setUploadedAt(LocalDateTime.now());
        entity.setUser(user);
        if (folder != null) entity.setSharedFolder(folder);
        fileRepository.save(entity);

        // ✅ 조건부로 PythonRunner 실행
        if (analyze) {
            if (folder != null)
                PythonRunner.runPythonScriptForSharedFolder(folderId, userId);
            else
                PythonRunner.runPythonScriptForUser(userId);
        }

        return ResponseEntity.ok("업로드 성공");
    }

    @GetMapping("/download-by-name")
    public ResponseEntity<Resource> downloadByFilenameAndUserId(
            @RequestParam String userId,
            @RequestParam String filename,
            @RequestParam(required = false) Long folderId,
            HttpSession session) throws IOException {

        String sessionUserId = (String) session.getAttribute("userId");
        if (sessionUserId == null || !sessionUserId.equals(userId))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<FileEntity> fileOpt = (folderId != null)
                ? fileRepository.findBySharedFolder_Id(folderId).stream()
                .filter(f -> f.getFilename().equals(filename)).findFirst()
                : fileRepository.findByFilenameAndUser_UserIdAndSharedFolderIsNull(filename, userId);

        if (fileOpt.isEmpty()) return ResponseEntity.notFound().build();
        FileEntity file = fileOpt.get();

        if (file.getSharedFolder() != null) {
            User user = userRepository.findByUserId(userId).orElse(null);
            if (user == null || !hasAccessToFolder(user, file.getSharedFolder()))
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        InputStream inputStream = s3Service.downloadFile(file.getFilepath());
        InputStreamResource resource = new InputStreamResource(inputStream);

        String originalFilename = file.getFilename();
        String encodedFilename = URLEncoder.encode(originalFilename, StandardCharsets.UTF_8)
                .replaceAll("\\+", "%20");

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename*=UTF-8''" + encodedFilename); // ✔ 브라우저가 인식 가능하도록 정확히 설정

        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(file.getSize())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/delete-by-name")
    public ResponseEntity<?> deleteByFilename(
            @RequestParam String userId,
            @RequestParam String filename,
            HttpSession session) {

        String sessionUserId = (String) session.getAttribute("userId");
        if (sessionUserId == null || !sessionUserId.equals(userId))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("삭제 권한 없음");

        FileEntity file = fileRepository.findByFilenameAndUser_UserIdAndSharedFolderIsNull(filename, userId).orElse(null);
        if (file == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("파일 없음");

        s3Service.deleteFile(file.getFilepath());
        fileRepository.delete(file);

        try {
            String jsonKey = "user_" + userId + "/document_clusters_kmeans.json";
            String cacheKey = "user_" + userId + "/new_files_cache.json";

            // 개인 파일 삭제
            if (s3Service.fileExists(jsonKey)) {
                List<Map<String, Object>> clusters = s3Service.readJson(jsonKey);
                clusters.removeIf(item -> filename.equals(item.get("filename")));
                s3Service.writeJsonMap(jsonKey, clusters);  // ✅ 변경
            }
            if (s3Service.fileExists(cacheKey)) {
                List<String> cacheList = s3Service.readJsonAsList(cacheKey);
                cacheList.removeIf(name -> name.equals(filename));
                s3Service.writeJsonList(cacheKey, cacheList);  // ✅ 변경
            }
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("JSON 수정 중 오류");
        }
        return ResponseEntity.ok("삭제 완료 (JSON 포함)");
    }

    @DeleteMapping("/shared-folder/delete-by-name")
    public ResponseEntity<?> deleteSharedFileByName(
            @RequestParam Long folderId,
            @RequestParam String filename,
            @RequestParam String userId,
            HttpSession session) {

        String sessionUserId = (String) session.getAttribute("userId");
        if (sessionUserId == null || !sessionUserId.equals(userId))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("삭제 권한 없음");

        User user = userRepository.findByUserId(userId).orElse(null);
        SharedFolder folder = sharedFolderRepository.findById(folderId).orElse(null);
        if (user == null || folder == null || !hasAccessToFolder(user, folder))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한 없음");

        // 🔥 userId 조건 제거
        FileEntity file = fileRepository.findByFilenameAndSharedFolder_Id(filename, folderId).orElse(null);
        if (file == null)
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("파일 없음");

        // 🔐 본인이 업로드한 파일이 아니면 삭제 불가
        if (!file.getUser().getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("삭제 권한 없음");
        }

        s3Service.deleteFile(file.getFilepath());
        fileRepository.delete(file);

        try {
            String jsonKey = "shared_" + folderId + "/document_clusters_kmeans.json";
            String cacheKey = "shared_" + folderId + "/new_files_cache.json";
            // 공유 폴더 파일 삭제
            if (s3Service.fileExists(jsonKey)) {
                List<Map<String, Object>> clusters = s3Service.readJson(jsonKey);
                clusters.removeIf(item -> filename.equals(item.get("filename")));
                s3Service.writeJsonMap(jsonKey, clusters);  // ✅ 변경
            }
            if (s3Service.fileExists(cacheKey)) {
                List<String> cacheList = s3Service.readJsonAsList(cacheKey);
                cacheList.removeIf(name -> name.equals(filename));
                s3Service.writeJsonList(cacheKey, cacheList);  // ✅ 변경
            }
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("JSON 수정 중 오류");
        }
        return ResponseEntity.ok("공유폴더 파일 삭제 완료 (JSON 포함)");
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> checkFileExists(
            @RequestParam String filename,
            @RequestParam(required = false) Long folderId,
            HttpSession session) {

        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "로그인 필요"));

        boolean exists = (folderId != null)
                ? fileRepository.findByFilenameAndSharedFolder_Id(filename, folderId).isPresent()
                : fileRepository.findByFilenameAndUser_UserIdAndSharedFolderIsNull(filename, userId).isPresent();

        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @GetMapping("/my-all")
    public ResponseEntity<List<FileEntity>> getAllMyUploadedFiles(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        return ResponseEntity.ok(fileRepository.findByUser_Id(user.getId()));
    }

    @GetMapping("/list")
    public ResponseEntity<List<FileEntity>> getMyFiles(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().build();

        return ResponseEntity.ok(fileRepository.findByUser_IdAndSharedFolderIsNull(user.getId()));
    }

    @GetMapping("/public-download")
    public ResponseEntity<Resource> publicDownload(
            @RequestParam String filename,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) Long folderId
    ) throws IOException {

        Optional<FileEntity> fileOpt;

        // 공유 폴더 파일 요청인 경우
        if (folderId != null) {
            fileOpt = fileRepository.findByFilenameAndSharedFolder_Id(filename, folderId);
        }
        // 개인 파일 요청인 경우
        else if (userId != null) {
            fileOpt = fileRepository.findByFilenameAndUser_UserIdAndSharedFolderIsNull(filename, userId);
        }
        // 둘 다 없으면 잘못된 요청
        else {
            return ResponseEntity.badRequest().body(null);
        }

        if (fileOpt.isEmpty()) return ResponseEntity.notFound().build();
        FileEntity file = fileOpt.get();

        InputStream inputStream = s3Service.downloadFile(file.getFilepath());
        InputStreamResource resource = new InputStreamResource(inputStream);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .contentLength(file.getSize())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
    @GetMapping("/public-presigned-url")
    public ResponseEntity<String> getPresignedUrl(
            @RequestParam String filename,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) Long folderId) {

        Optional<FileEntity> fileOpt;

        // 공유 폴더 파일 요청인 경우
        if (folderId != null) {
            fileOpt = fileRepository.findByFilenameAndSharedFolder_Id(filename, folderId);
        }
        // 개인 파일 요청인 경우
        else if (userId != null) {
            fileOpt = fileRepository.findByFilenameAndUser_UserIdAndSharedFolderIsNull(filename, userId);
        }
        // 둘 다 없으면 잘못된 요청
        else {
            return ResponseEntity.badRequest().body("userId 또는 folderId 필요");
        }

        if (fileOpt.isEmpty()) return ResponseEntity.notFound().build();
        FileEntity file = fileOpt.get();

        String presignedUrl = s3Service.generatePresignedUrl(file.getFilepath(), 10); // 10분 유효
        return ResponseEntity.ok(presignedUrl);
    }

    @PostMapping("/callback")
    public ResponseEntity<String> handleOnlyOfficeCallback(
            @RequestParam String filename,
            @RequestParam String userId,
            @RequestBody Map<String, Object> body) {

        int status = (int) body.get("status");

        if (status == 2 || status == 6) { // 2 = 저장 완료, 6 = 포스 세이브
            Map<String, Object> document = (Map<String, Object>) body.get("url");
            String downloadUrl = (String) body.get("url");

            try (InputStream inputStream = new URL(downloadUrl).openStream()) {
                String s3Key = "user_" + userId + "/" + filename;
                s3Service.uploadFile(new MockMultipartFile(filename, inputStream), s3Key);
                return ResponseEntity.ok("{\"error\":0}");
            } catch (Exception e) {
                return ResponseEntity.status(500).body("{\"error\":1}");
            }
        }

        return ResponseEntity.ok("{\"error\":0}");
    }
}