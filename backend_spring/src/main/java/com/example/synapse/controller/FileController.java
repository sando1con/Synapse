package com.example.synapse.controller;

import com.example.synapse.entity.FileEntity;
import com.example.synapse.entity.SharedFolder;
import com.example.synapse.entity.User;
import com.example.synapse.repository.FileRepository;
import com.example.synapse.repository.SharedFolderRepository;
import com.example.synapse.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.synapse.service.PythonRunner;


import java.io.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileRepository fileRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SharedFolderRepository sharedFolderRepository;

    private final String uploadDir = System.getProperty("user.dir") + "/uploaded_files";

    private boolean hasAccessToFolder(User user, SharedFolder folder) {
        return folder.getSharedUsers().contains(user) || (folder.getOwner() != null && folder.getOwner().equals(user));
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) Long folderId,
            HttpSession session
    ) throws IOException {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("사용자 정보 없음");
        }

        String originalName = StringUtils.cleanPath(file.getOriginalFilename());

        // ✅ 업로드 경로 결정
        String targetDir;
        SharedFolder folder = null;  // 👉 공유 폴더 정보 저장용

        if (folderId != null) {
            folder = sharedFolderRepository.findById(folderId).orElse(null);
            if (folder == null || !hasAccessToFolder(user, folder)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("해당 공유 폴더에 대한 권한이 없습니다.");
            }
            targetDir = uploadDir + "/shared_" + folderId;
        } else {
            targetDir = uploadDir + "/user_" + user.getUserId();
        }

        File directory = new File(targetDir);
        if (!directory.exists()) directory.mkdirs();

        File targetFile = new File(directory, originalName);
        file.transferTo(targetFile);

        FileEntity entity = new FileEntity();
        entity.setFilename(originalName);
        entity.setFilepath(targetFile.getPath());
        entity.setSize(file.getSize());
        entity.setMimetype(file.getContentType());
        entity.setUploadedAt(LocalDateTime.now());
        entity.setUser(user);

        // ✅ 공유 폴더에 업로드한 경우 해당 정보 추가
        if (folder != null) {
            entity.setSharedFolder(folder);
        }

        fileRepository.save(entity);
        // 업로드 완료 후 분석 실행
        PythonRunner.runPythonScript(user.getUserId());
        return ResponseEntity.ok("업로드 성공");
    }

    @GetMapping("/my-all")
    public ResponseEntity<List<FileEntity>> getAllMyUploadedFiles(HttpSession session) {
        String userIdStr = (String) session.getAttribute("userId");
        if (userIdStr == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userIdStr).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();

        // ✅ 공유폴더 포함, 사용자가 업로드한 모든 파일 조회
        List<FileEntity> files = fileRepository.findByUser_Id(user.getId());
        return ResponseEntity.ok(files);
    }

    // ✅ 내 파일 목록 조회
    @GetMapping("/list")
    public ResponseEntity<List<FileEntity>> getMyFiles(HttpSession session) {
        String userIdStr = (String) session.getAttribute("userId");
        if (userIdStr == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userIdStr).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();

        // ✅ 공유폴더에 속하지 않은 개인 파일만 조회
        List<FileEntity> files = fileRepository.findByUser_IdAndSharedFolderIsNull(user.getId());
        return ResponseEntity.ok(files);
    }

    @GetMapping("/download-by-name")
    public ResponseEntity<Resource> downloadByFilenameAndUserId(
            @RequestParam String userId,
            @RequestParam String filename,
            HttpSession session) throws IOException {

        String sessionUserId = (String) session.getAttribute("userId");
        if (sessionUserId == null || !sessionUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        FileEntity file = fileRepository.findByFilenameAndUser_UserId(filename, userId).orElse(null);
        if (file == null) return ResponseEntity.notFound().build();

        // 공유 폴더에 있으면 권한 확인
        if (file.getSharedFolder() != null) {
            User user = userRepository.findByUserId(userId).orElse(null);
            if (user == null || !hasAccessToFolder(user, file.getSharedFolder())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }

        File physicalFile = new File(file.getFilepath());
        if (!physicalFile.exists()) return ResponseEntity.notFound().build();

        InputStreamResource resource = new InputStreamResource(new FileInputStream(physicalFile));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFilename() + "\"")
                .contentLength(physicalFile.length())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @DeleteMapping("/delete-by-name")
    public ResponseEntity<?> deleteByFilename(
            @RequestParam String userId,
            @RequestParam String filename,
            HttpSession session) {

        String sessionUserId = (String) session.getAttribute("userId");

        // 세션 인증 체크 및 본인 파일인지 검증
        if (sessionUserId == null || !sessionUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("삭제 권한이 없습니다.");
        }

        // 사용자 소유의 파일 중에서 filename 일치하는 파일 조회
        FileEntity file = fileRepository.findByFilenameAndUser_UserId(filename, userId).orElse(null);
        if (file == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("해당 파일을 찾을 수 없습니다.");
        }

        // 공유폴더 파일이면 거부
        if (file.getSharedFolder() != null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("공유폴더 파일은 이 경로에서 삭제할 수 없습니다.");
        }

        // 실제 파일 삭제
        File physicalFile = new File(file.getFilepath());
        if (physicalFile.exists()) physicalFile.delete();

        // DB에서 삭제
        fileRepository.delete(file);

        // ✅ JSON에서 해당 파일 제거
        try {
            File jsonFile = new File("uploaded_files/user_" + userId + "/document_clusters_kmeans.json");
            if (jsonFile.exists()) {
                ObjectMapper mapper = new ObjectMapper();
                List<Map<String, Object>> clusters = mapper.readValue(jsonFile, new TypeReference<>() {});
                clusters.removeIf(item -> filename.equals(item.get("filename")));

                mapper.writerWithDefaultPrettyPrinter().writeValue(jsonFile, clusters);
            }
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("JSON 수정 중 오류 발생");
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

        // 세션 인증 + 본인 확인
        if (sessionUserId == null || !sessionUserId.equals(userId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("삭제 권한이 없습니다.");
        }

        // 사용자 유효성
        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("사용자 정보 없음");

        // 공유 폴더 접근 권한 확인
        SharedFolder folder = sharedFolderRepository.findById(folderId).orElse(null);
        if (folder == null || !hasAccessToFolder(user, folder)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("공유 폴더 접근 권한 없음");
        }

        // 공유 폴더 내의 해당 파일 찾기
        FileEntity file = fileRepository.findByFilenameAndSharedFolder_IdAndUser_UserId(filename, folderId, userId).orElse(null);
        if (file == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("파일을 찾을 수 없습니다.");

        // 물리 파일 삭제
        File physicalFile = new File(file.getFilepath());
        if (physicalFile.exists()) physicalFile.delete();

        fileRepository.delete(file);
        // 🔁 클러스터링 결과 재생성
        PythonRunner.runPythonScript(userId);
        return ResponseEntity.ok("공유폴더 파일 삭제 완료");
    }
}