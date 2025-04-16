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
     * 예:
     *   - 개인: /api/preview?userId=gksrnr&filename=sample.docx
     *   - 공유: /api/preview?folderId=5&filename=sample.docx
     */
    @GetMapping
    public ResponseEntity<byte[]> getPreviewImage(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) Long folderId,
            @RequestParam String filename) {

        try {
            File file;

            if (folderId != null) {
                file = new File("uploaded_files/shared_" + folderId + "/" + filename);
            } else if (userId != null) {
                file = new File("uploaded_files/user_" + userId + "/" + filename);
            } else {
                return ResponseEntity.badRequest().body(null); // 둘 다 없으면 잘못된 요청
            }

            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

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
