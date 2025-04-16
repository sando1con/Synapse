package com.example.synapse.controller;

import com.example.synapse.service.FilePreviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;

@RestController
@RequestMapping("/api/preview")
public class FilePreviewController {

    @Autowired
    private FilePreviewService previewService;

    /**
     * .docx 파일의 첫 페이지를 이미지로 반환
     * 예: /api/preview?userId=gksrnr&filename=sample.docx
     */
    @GetMapping
    public ResponseEntity<byte[]> getPreviewImage(
            @RequestParam String userId,
            @RequestParam String filename) {

        try {
            // 사용자의 업로드 경로
            File file = new File("uploaded_files/user_" + userId + "/" + filename);

            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

            // .docx -> 이미지 변환
            BufferedImage image = previewService.convertDocxToImage(file);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);

            return new ResponseEntity<>(baos.toByteArray(), headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}