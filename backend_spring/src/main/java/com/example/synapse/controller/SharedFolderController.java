package com.example.synapse.controller;

import com.example.synapse.entity.FileEntity;
import com.example.synapse.entity.SharedFolder;
import com.example.synapse.entity.User;
import com.example.synapse.repository.FileRepository;
import com.example.synapse.repository.SharedFolderRepository;
import com.example.synapse.repository.UserRepository;
import com.example.synapse.service.S3Service;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/shared-folders")
public class SharedFolderController {

    @Autowired private SharedFolderRepository sharedFolderRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private FileRepository fileRepository;
    @Autowired private S3Service s3Service;

    @PostMapping("/create")
    public Map<String, String> createFolder(@RequestParam String folderName, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        User owner = userRepository.findByUserId(userId).orElseThrow();

        SharedFolder folder = new SharedFolder();
        folder.setFolderName(folderName);
        folder.setOwner(owner);
        folder.setShareUrl(UUID.randomUUID().toString());

        sharedFolderRepository.save(folder);

        Map<String, String> response = new HashMap<>();
        response.put("url", "http://localhost:3000/shared/" + folder.getShareUrl());
        return response;
    }

    @GetMapping("/files")
    public ResponseEntity<List<FileEntity>> getSharedFolderFiles(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();

        List<SharedFolder> sharedFolders = sharedFolderRepository.findBySharedUsers_IdAndActive(user.getId(), true);
        List<FileEntity> allFiles = new ArrayList<>();
        for (SharedFolder folder : sharedFolders) {
            List<FileEntity> folderFiles = fileRepository.findBySharedFolder_Id(folder.getId());
            allFiles.addAll(folderFiles);
        }

        return ResponseEntity.ok(allFiles);
    }

    @PostMapping("/accept/{url}")
    public ResponseEntity<String> acceptSharedFolder(@PathVariable String url, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 필요");

        SharedFolder folder = sharedFolderRepository.findByShareUrl(url).orElse(null);
        if (folder == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("유효하지 않은 URL입니다.");

        if (folder.getSharedUsers().contains(user)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 수락한 사용자입니다.");
        }

        folder.getSharedUsers().add(user);
        folder.setActive(true);
        sharedFolderRepository.save(folder);

        return ResponseEntity.ok("공유 폴더 수락 완료!");
    }

    @GetMapping("/my-folders")
    public List<SharedFolder> getMyFolders(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        User user = userRepository.findByUserId(userId).orElseThrow();
        return sharedFolderRepository.findAll().stream()
                .filter(f -> (f.getOwner() != null && f.getOwner().getId().equals(user.getId()))
                        || f.getSharedUsers().contains(user))
                .toList();
    }

    @GetMapping("/{folderId}/files")
    public ResponseEntity<List<FileEntity>> getFilesInSharedFolder(@PathVariable Long folderId, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userId).orElse(null);
        SharedFolder folder = sharedFolderRepository.findById(folderId).orElse(null);

        boolean isOwner = folder.getOwner() != null && folder.getOwner().equals(user);
        boolean isSharedUser = folder.getSharedUsers().contains(user);

        if (folder == null || (!isOwner && !isSharedUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<FileEntity> files = fileRepository.findBySharedFolder_Id(folderId);
        return ResponseEntity.ok(files);
    }

    @DeleteMapping("/delete/{folderId}")
    public ResponseEntity<String> deleteSharedFolder(@PathVariable Long folderId, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        User user = userRepository.findByUserId(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("사용자 정보 없음");
        }

        Optional<SharedFolder> folderOpt = sharedFolderRepository.findById(folderId);
        if (folderOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("공유 폴더를 찾을 수 없습니다.");
        }

        SharedFolder folder = folderOpt.get();
        if (folder.getOwner() == null || !folder.getOwner().equals(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("삭제 권한이 없습니다.");
        }

        List<FileEntity> files = fileRepository.findBySharedFolder_Id(folderId);
        for (FileEntity file : files) {
            s3Service.deleteFile(file.getFilepath());
        }
        fileRepository.deleteAll(files);

        folder.getSharedUsers().clear();
        sharedFolderRepository.delete(folder);

        String jsonKey = "shared_" + folderId + "/document_clusters_kmeans.json";
        if (s3Service.fileExists(jsonKey)) {
            s3Service.deleteFile(jsonKey);
        }

        return ResponseEntity.ok("공유 폴더 및 관련 파일들이 삭제되었습니다.");
    }
}