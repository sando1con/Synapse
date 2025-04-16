package com.example.synapse.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;

@Service
public class FilePreviewService {

    @Value("${libreoffice.path}")
    private String libreOfficePath;

    /**
     * DOCX 파일을 PDF로 변환한 뒤, 1페이지 이미지를 반환
     */
    public BufferedImage convertDocxToImage(File docxFile) throws IOException, InterruptedException {
        String pdfPath = docxFile.getAbsolutePath().replace(".docx", ".pdf");

        // LibreOffice로 docx → pdf 변환
        ProcessBuilder pb = new ProcessBuilder(
                libreOfficePath,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", docxFile.getParent(),
                docxFile.getAbsolutePath()
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("LibreOffice 변환 실패 (exit code: " + exitCode + ")");
        }

        File pdfFile = new File(pdfPath);
        if (!pdfFile.exists()) {
            throw new FileNotFoundException("PDF 변환 결과 없음: " + pdfPath);
        }

        // PDF의 첫 페이지를 이미지로 렌더링
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(0, 300);  // 첫 페이지, 150dpi
            return image;
        } finally {
            pdfFile.delete(); // 사용 후 삭제
        }
    }
}
