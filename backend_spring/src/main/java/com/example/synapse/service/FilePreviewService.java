package com.example.synapse.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.client.MultipartBodyBuilder;

import java.awt.image.BufferedImage;
import java.io.*;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.PDPageContentStream;

import org.commonmark.node.Node;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;

@Service
public class FilePreviewService {

    @Value("${libreoffice.path}")
    private String libreOfficePath;

    @Value("${hancom.api.key}")
    private String hancomApiKey;

    public BufferedImage convertDocxToImage(File docxFile) throws IOException, InterruptedException {
        String pdfPath = docxFile.getAbsolutePath().replace(".docx", ".pdf");

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

        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFRenderer renderer = new PDFRenderer(document);
            return renderer.renderImageWithDPI(0, 300);
        } finally {
            pdfFile.delete();
        }
    }

    public BufferedImage convertDocxToImage(InputStream inputStream) throws IOException, InterruptedException {
        File tempDocxFile = File.createTempFile("preview", ".docx");
        try (OutputStream out = new FileOutputStream(tempDocxFile)) {
            inputStream.transferTo(out);
        }

        BufferedImage image = convertDocxToImage(tempDocxFile);
        tempDocxFile.delete();
        return image;
    }

    public byte[] convertDocxToPdfBytes(InputStream docxInputStream) throws IOException, InterruptedException {
        File tempDocx = File.createTempFile("preview-", ".docx");
        try (OutputStream out = new FileOutputStream(tempDocx)) {
            docxInputStream.transferTo(out);
        }

        String pdfPath = tempDocx.getAbsolutePath().replace(".docx", ".pdf");

        ProcessBuilder pb = new ProcessBuilder(
                libreOfficePath,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", tempDocx.getParent(),
                tempDocx.getAbsolutePath()
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

        byte[] pdfBytes = java.nio.file.Files.readAllBytes(pdfFile.toPath());

        tempDocx.delete();
        pdfFile.delete();

        return pdfBytes;
    }

    public byte[] convertHwpToPdfViaHancom(InputStream hwpInputStream) throws IOException {
        File tempHwp = File.createTempFile("preview-", ".hwp");
        try (OutputStream out = new FileOutputStream(tempHwp)) {
            hwpInputStream.transferTo(out);
        }

        WebClient webClient = WebClient.create("https://api.hancomdocs.com/v1");

        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new FileSystemResource(tempHwp));
        MultiValueMap<String, HttpEntity<?>> multipartData = builder.build();

        byte[] result = webClient.post()
                .uri("/convert/hwp-to-pdf")
                .header("Authorization", "Bearer " + hancomApiKey)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(multipartData))
                .retrieve()
                .bodyToMono(byte[].class)
                .block();

        tempHwp.delete();
        return result;
    }

    public byte[] convertTxtToPdf(InputStream txtInputStream) throws IOException {
        File tempPdf = File.createTempFile("preview-", ".pdf");

        try (PDDocument doc = new PDDocument();
             BufferedReader reader = new BufferedReader(new InputStreamReader(txtInputStream))) {

            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page)) {
                contentStream.setFont(PDType1Font.HELVETICA, 12);
                contentStream.beginText();
                contentStream.setLeading(14.5f);
                contentStream.newLineAtOffset(50, 750); // 시작 위치

                String line;
                int lineCount = 0;
                while ((line = reader.readLine()) != null) {
                    contentStream.showText(line);
                    contentStream.newLine();
                    lineCount++;
                    if (lineCount >= 45) break; // 한 페이지 제한
                }

                contentStream.endText();
            }

            doc.save(tempPdf);
            return java.nio.file.Files.readAllBytes(tempPdf.toPath());
        } finally {
            tempPdf.delete();
        }
    }
    public byte[] convertTxtToPdfViaLibreOffice(InputStream txtInputStream) throws IOException, InterruptedException {
        // 1. 임시 txt 파일 저장
        File tempTxt = File.createTempFile("preview-", ".txt");
        try (OutputStream out = new FileOutputStream(tempTxt)) {
            txtInputStream.transferTo(out);
        }

        // 2. 출력할 PDF 경로 결정
        String pdfPath = tempTxt.getAbsolutePath().replace(".txt", ".pdf");

        // 3. LibreOffice CLI 실행
        ProcessBuilder pb = new ProcessBuilder(
                libreOfficePath,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", tempTxt.getParent(),
                tempTxt.getAbsolutePath()
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();
        int exitCode = process.waitFor();

        if (exitCode != 0) {
            throw new RuntimeException("LibreOffice를 이용한 txt → PDF 변환 실패 (exit code: " + exitCode + ")");
        }

        // 4. 결과 PDF 읽기
        File pdfFile = new File(pdfPath);
        if (!pdfFile.exists()) {
            throw new FileNotFoundException("LibreOffice 변환 결과 PDF가 존재하지 않습니다.");
        }

        byte[] pdfBytes = java.nio.file.Files.readAllBytes(pdfFile.toPath());

        // 5. 정리
        tempTxt.delete();
        pdfFile.delete();

        return pdfBytes;
    }

    public byte[] convertPptxToPdfBytes(InputStream pptxInputStream) throws IOException, InterruptedException {
        return convertOfficeToPdfBytes(pptxInputStream, ".pptx");
    }

    public byte[] convertXlsxToPdfBytes(InputStream xlsxInputStream) throws IOException, InterruptedException {
        return convertOfficeToPdfBytes(xlsxInputStream, ".xlsx");
    }

    private byte[] convertOfficeToPdfBytes(InputStream inputStream, String extension) throws IOException, InterruptedException {
        File tempInput = File.createTempFile("preview-", extension);
        try (OutputStream out = new FileOutputStream(tempInput)) {
            inputStream.transferTo(out);
        }

        String pdfPath = tempInput.getAbsolutePath().replace(extension, ".pdf");

        ProcessBuilder pb = new ProcessBuilder(
                libreOfficePath,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", tempInput.getParent(),
                tempInput.getAbsolutePath()
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

        byte[] pdfBytes = java.nio.file.Files.readAllBytes(pdfFile.toPath());

        tempInput.delete();
        pdfFile.delete();

        return pdfBytes;
    }
    public byte[] convertMdToPdfBytes(InputStream mdInputStream) throws IOException {
        File tempMd = File.createTempFile("preview-", ".md");
        try (OutputStream out = new FileOutputStream(tempMd)) {
            mdInputStream.transferTo(out);
        }

        String mdContent = new String(java.nio.file.Files.readAllBytes(tempMd.toPath()));
        tempMd.delete();

        // Markdown → HTML
        Parser parser = Parser.builder().build();
        Node document = parser.parse(mdContent);
        HtmlRenderer renderer = HtmlRenderer.builder().build();
        String html = renderer.render(document);

        File tempHtml = File.createTempFile("preview-", ".html");
        try (FileOutputStream out = new FileOutputStream(tempHtml)) {
            out.write(html.getBytes());
        }

        String pdfPath = tempHtml.getAbsolutePath().replace(".html", ".pdf");

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    libreOfficePath,
                    "--headless",
                    "--convert-to", "pdf",
                    "--outdir", tempHtml.getParent(),
                    tempHtml.getAbsolutePath()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new RuntimeException("LibreOffice 변환 실패 (exit code: " + exitCode + ")");
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
            throw new RuntimeException("LibreOffice 실행 중 예외 발생: " + e.getMessage(), e);
        }

        File pdfFile = new File(pdfPath);
        if (!pdfFile.exists()) {
            throw new FileNotFoundException("PDF 변환 결과 없음: " + pdfPath);
        }

        byte[] pdfBytes = java.nio.file.Files.readAllBytes(pdfFile.toPath());

        tempHtml.delete();
        pdfFile.delete();

        return pdfBytes;
    }
}