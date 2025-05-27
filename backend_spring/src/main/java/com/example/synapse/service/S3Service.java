package com.example.synapse.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.*;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class S3Service {

    private final S3Client s3Client;
    private final ObjectMapper mapper = new ObjectMapper();
    private final S3Presigner s3Presigner; // ✅ 추가

    @Value("${cloud.aws.s3.bucket}")
    private String bucketName;

    public S3Service(
            @Value("${cloud.aws.credentials.access-key}") String accessKey,
            @Value("${cloud.aws.credentials.secret-key}") String secretKey,
            @Value("${cloud.aws.region.static}") String region
    ) {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey); // ✅ 추가
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKey, secretKey)
                        ))
                .build();
        this.s3Presigner = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
    }

    public void uploadFile(MultipartFile file, String key) throws IOException {
        s3Client.putObject(
                PutObjectRequest.builder().bucket(bucketName).key(key).build(),
                RequestBody.fromBytes(file.getBytes())
        );
    }

    public InputStream downloadFile(String key) {
        GetObjectRequest request = GetObjectRequest.builder().bucket(bucketName).key(key).build();
        ResponseInputStream<GetObjectResponse> stream = s3Client.getObject(request);
        return stream;
    }

    public void deleteFile(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucketName).key(key).build());
    }

    public boolean fileExists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucketName).key(key).build());
            return true;
        } catch (S3Exception e) {
            return false;
        }
    }

    // ✅ 파일 전체 내용을 문자열로 반환
    public String getFileAsString(String key) throws IOException {
        InputStream inputStream = downloadFile(key);
        return new BufferedReader(new InputStreamReader(inputStream))
                .lines()
                .collect(Collectors.joining("\n"));
    }

    // ✅ JSON 파일을 List<Map<String, Object>> 형태로 읽기
    public List<Map<String, Object>> readJson(String key) throws IOException {
        String json = getFileAsString(key);
        return mapper.readValue(json, new TypeReference<>() {});
    }

    public List<String> readJsonAsList(String s3Key) throws IOException {
        InputStream inputStream = downloadFile(s3Key);  // ✅ 기존에 정의된 메서드 사용
        return mapper.readValue(inputStream, new TypeReference<List<String>>() {});
    }
    // Map형 JSON 저장
    public void writeJsonMap(String key, List<Map<String, Object>> content) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        mapper.writerWithDefaultPrettyPrinter().writeValue(baos, content);
        byte[] jsonBytes = baos.toByteArray();
        s3Client.putObject(PutObjectRequest.builder().bucket(bucketName).key(key).build(),
                RequestBody.fromBytes(jsonBytes));
    }

    // String형 JSON 저장
    public void writeJsonList(String key, List<String> content) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        mapper.writerWithDefaultPrettyPrinter().writeValue(baos, content);
        byte[] jsonBytes = baos.toByteArray();
        s3Client.putObject(PutObjectRequest.builder().bucket(bucketName).key(key).build(),
                RequestBody.fromBytes(jsonBytes));
    }

    public String generatePresignedUrl(String key, int expirationInMinutes) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationInMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    // ✅ 특정 prefix를 가진 모든 파일 목록 반환
    public List<String> listFilesWithPrefix(String prefix) {
        ListObjectsV2Request request = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .build();

        ListObjectsV2Response result = s3Client.listObjectsV2(request);

        return result.contents().stream()
                .map(S3Object::key)
                .collect(Collectors.toList());
    }
}