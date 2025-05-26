package com.example.synapse.controller;

import com.example.synapse.service.FilePreviewService;
import com.example.synapse.service.S3Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.*;

@RestController
@RequestMapping("/api/preview/full-pdf")
public class FilePreviewController {

    @Autowired
    private FilePreviewService previewService;

    @Autowired
    private S3Service s3Service;

    /**
     * 다양한 파일(docx, pdf, hwp, txt 등)을 PDF로 변환하거나 그대로 반환
     * 예:
     *   - 개인: /api/preview/full-pdf?userId=gksrnr&filename=sample.docx
     *   - 공유: /api/preview/full-pdf?folderId=5&filename=sample.docx
     */
    @GetMapping
    public ResponseEntity<byte[]> getPreviewPdf(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) Long folderId,
            @RequestParam String filename) {

        try {
            // 🔑 S3 Key 결정
            String s3Key;
            if (folderId != null) {
                s3Key = "shared_" + folderId + "/" + filename;
            } else if (userId != null) {
                s3Key = "user_" + userId + "/" + filename;
            } else {
                return ResponseEntity.badRequest().body(null);
            }

            if (!s3Service.fileExists(s3Key)) {
                return ResponseEntity.notFound().build();
            }

            byte[] pdfBytes;
            InputStream fileStream = s3Service.downloadFile(s3Key);

            // 🔁 파일 확장자에 따라 처리 분기
            if (filename.endsWith(".pdf")) {
                pdfBytes = fileStream.readAllBytes();
            } else if (filename.endsWith(".docx")) {
                pdfBytes = previewService.convertDocxToPdfBytes(fileStream);
            } else if (filename.endsWith(".hwp")) {
                pdfBytes = previewService.convertHwpToPdfViaHancom(fileStream);
            } else if (filename.endsWith(".txt")) {
                pdfBytes = previewService.convertTxtToPdfViaLibreOffice(fileStream);
            }
            else if (filename.endsWith(".pptx")) {
                pdfBytes = previewService.convertPptxToPdfBytes(fileStream);
            } else if (filename.endsWith(".xlsx")) {
                pdfBytes = previewService.convertXlsxToPdfBytes(fileStream);
            } else if (filename.endsWith(".md")) {
                pdfBytes = previewService.convertMdToPdfBytes(fileStream);
            }
            else {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}