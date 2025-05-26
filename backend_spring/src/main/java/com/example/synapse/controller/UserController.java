package com.example.synapse.controller;

import com.example.synapse.dto.PasswordChangeRequest;
import com.example.synapse.dto.UserDto;
import com.example.synapse.entity.User;
import com.example.synapse.service.S3Service;
import com.example.synapse.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired private UserService userService;
    @Autowired private S3Service s3Service;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            return ResponseEntity.ok(userService.registerUser(user));
        } catch (DataIntegrityViolationException e) {
            String message = e.getMessage();
            if (message.contains("userId")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("field", "userId", "message", "이미 사용 중인 ID입니다."));
            } else if (message.contains("username")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("field", "username", "message", "이미 사용 중인 이름입니다."));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "회원가입 중 오류 발생"));
            }
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            if (message.contains("아이디")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("field", "userId", "message", message));
            } else if (message.contains("이름")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("field", "username", "message", message));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", message));
            }
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginUser, HttpSession session) {
        User found = userService.login(loginUser.getUserId(), loginUser.getPassword());
        if (found == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "아이디 또는 비밀번호가 잘못되었습니다."));
        }
        session.setAttribute("userId", found.getUserId());
        return ResponseEntity.ok(Map.of("message", "로그인 성공!"));
    }

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

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok("로그아웃 완료!");
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteMyAccount(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401).body("로그인 필요");
        }

        // ✅ S3에서 해당 사용자의 모든 파일 삭제
        String prefix = "user_" + userId + "/";
        List<String> userFiles = s3Service.listFilesWithPrefix(prefix);
        for (String key : userFiles) {
            s3Service.deleteFile(key);
        }

        // ✅ 사용자 삭제
        userService.deleteByUserId(userId);
        session.invalidate();

        return ResponseEntity.ok("계정 삭제 완료");
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