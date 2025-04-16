package com.example.synapse.controller;

import com.example.synapse.dto.PasswordChangeRequest;
import com.example.synapse.dto.UserDto;
import com.example.synapse.entity.User;
import com.example.synapse.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class UserController {

    @Autowired
    private UserService userService;

    // 회원가입
    @PostMapping("/register")
    public User register(@RequestBody User user) {
        return userService.registerUser(user);
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser, HttpSession session) {
        User found = userService.login(loginUser.getUserId(), loginUser.getPassword());

        if (found == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 실패: 잘못된 정보");
        }

        // 로그인 성공 시 세션에 사용자 정보 저장
        session.setAttribute("userId", found.getUserId());

        return ResponseEntity.ok("로그인 성공!");
    }

    // 로그인된 사용자 정보 가져오기
    @GetMapping("/me")
    public ResponseEntity<?> getMyInfo(HttpSession session) {
        String userId = (String) session.getAttribute("userId");

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인되어 있지 않습니다.");
        }

        User user = userService.findByUserId(userId);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("사용자 정보를 찾을 수 없습니다.");
        }

        return ResponseEntity.ok(new UserDto(user));
    }

    // 로그아웃 (선택)
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok("로그아웃 완료!");
    }

    //계정탈퇴
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteMyAccount(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        System.out.println("현재 세션 userId = " + userId); // ✅ 콘솔 확인용 로그

        if (userId == null) {
            return ResponseEntity.status(401).body("로그인 필요");
        }

        // ✅ 사용자 업로드 폴더 경로 지정
        String folderPath = System.getProperty("user.dir") + "/uploaded_files/user_" + userId;
        File userFolder = new File(folderPath);
        if (userFolder.exists()) {
            deleteFolderRecursively(userFolder);
        }

        // ✅ 사용자 정보 삭제 (서비스 계층 호출)
        userService.deleteByUserId(userId);

        // ✅ 세션 만료
        session.invalidate();

        return ResponseEntity.ok("계정 삭제 완료");
    }

    private void deleteFolderRecursively(File folder) {
        File[] files = folder.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    deleteFolderRecursively(file);
                } else {
                    file.delete();
                }
            }
        }
        folder.delete(); // 폴더 자체도 삭제
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("userId");

        if (userId == null) {
            return ResponseEntity.status(401).body("로그인이 필요합니다.");
        }

        boolean changed = userService.changePassword(userId, request.getCurrentPassword(), request.getNewPassword());

        if (!changed) {
            return ResponseEntity.status(400).body("현재 비밀번호가 일치하지 않습니다.");
        }

        return ResponseEntity.ok("비밀번호가 변경되었습니다.");
    }

}