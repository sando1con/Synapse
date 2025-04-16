package com.example.synapse.controller;

import com.example.synapse.entity.FileEntity;
import com.example.synapse.entity.SharedFolder;
import com.example.synapse.entity.User;
import com.example.synapse.repository.FileRepository;
import com.example.synapse.repository.SharedFolderRepository;
import com.example.synapse.repository.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/shared-folders")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class SharedFolderController {

    @Autowired
    private SharedFolderRepository sharedFolderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileRepository fileRepository;

    // ✅ 공유 폴더 생성
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
            // 🔥 owner가 null이어도, sharedFolderId 기준으로 가져오기
            List<FileEntity> folderFiles = fileRepository.findBySharedFolder_Id(folder.getId());
            allFiles.addAll(folderFiles);
        }

        return ResponseEntity.ok(allFiles);
    }

    // ✅ 공유 수락
    @PostMapping("/accept/{url}")
    public String acceptSharedFolder(@PathVariable String url, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        User user = userRepository.findByUserId(userId).orElseThrow();

        SharedFolder folder = sharedFolderRepository.findByShareUrl(url).orElse(null);
        if (folder == null) return "유효하지 않은 URL입니다.";

        folder.getSharedUsers().add(user);
        folder.setActive(true); // 최초 수락 시 활성화
        sharedFolderRepository.save(folder);
        return "공유 폴더 수락 완료!";
    }

    // ✅ 내 공유 폴더 보기
    @GetMapping("/my-folders")
    public List<SharedFolder> getMyFolders(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        User user = userRepository.findByUserId(userId).orElseThrow();
        return sharedFolderRepository.findAll().stream()
                .filter(f -> (f.getOwner() != null && f.getOwner().getId().equals(user.getId()))
                        || f.getSharedUsers().contains(user))
                .toList();
    }

    // ✅ 특정 공유 폴더의 파일 목록 조회
    @GetMapping("/{folderId}/files")
    public ResponseEntity<List<FileEntity>> getFilesInSharedFolder(@PathVariable Long folderId, HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userRepository.findByUserId(userId).orElse(null);
        SharedFolder folder = sharedFolderRepository.findById(folderId).orElse(null);

        // 접근 권한 확인 시 null 체크 추가
        boolean isOwner = folder.getOwner() != null && folder.getOwner().equals(user);
        boolean isSharedUser = folder.getSharedUsers().contains(user);

        if (folder == null || (!isOwner && !isSharedUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<FileEntity> files = fileRepository.findBySharedFolder_Id(folderId);
        return ResponseEntity.ok(files);
    }
}