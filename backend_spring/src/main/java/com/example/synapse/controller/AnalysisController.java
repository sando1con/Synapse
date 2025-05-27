package com.example.synapse.controller;

import com.example.synapse.service.PythonRunner;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analyze")
public class AnalysisController {

    // 📊 개인 사용자 분석 요청
    @PostMapping("/user")
    public ResponseEntity<String> analyzeUser(HttpSession session) {
        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 필요");
        }

        PythonRunner.runPythonScriptForUser(userId);
        return ResponseEntity.ok("📊 사용자 분석 요청 완료");
    }

    // 🤝 공유 폴더 분석 요청
    @PostMapping("/shared")
    public ResponseEntity<String> analyzeShared(
            @RequestParam Long folderId,
            HttpSession session) {

        String userId = (String) session.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 필요");
        }

        PythonRunner.runPythonScriptForSharedFolder(folderId, userId);
        return ResponseEntity.ok("🤝 공유폴더 분석 요청 완료");
    }
}