package com.example.synapse.controller;

import com.example.synapse.service.S3Service;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ClusterController {

    private final S3Service s3Service;
    private final ObjectMapper mapper = new ObjectMapper();

    public ClusterController(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    // ✅ 사용자 클러스터 목록
    @GetMapping("/clusters/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getUserClusters(@PathVariable String userId) {
        String s3Key = "user_" + userId + "/document_clusters_kmeans.json";
        try {
            if (!s3Service.fileExists(s3Key)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }
            String json = s3Service.getFileAsString(s3Key);
            List<Map<String, Object>> clusterList = mapper.readValue(json, new TypeReference<>() {});
            return ResponseEntity.ok(clusterList);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ 사용자 클러스터별 파일 목록
    @GetMapping("/cluster-files/{userId}/{clusterId}")
    public ResponseEntity<List<String>> getFilesByUserAndCluster(
            @PathVariable String userId, @PathVariable int clusterId) {
        String s3Key = "user_" + userId + "/document_clusters_kmeans.json";
        try {
            if (!s3Service.fileExists(s3Key)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }
            String json = s3Service.getFileAsString(s3Key);
            List<Map<String, Object>> clusterList = mapper.readValue(json, new TypeReference<>() {});
            List<String> filesInCluster = new ArrayList<>();
            for (Map<String, Object> item : clusterList) {
                int cluster = (Integer) item.get("cluster");
                if (cluster == clusterId) {
                    filesInCluster.add((String) item.get("filename"));
                }
            }
            return ResponseEntity.ok(filesInCluster);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ 공유 폴더 클러스터 목록
    @GetMapping("/shared-folder-clusters/{folderId}")
    public ResponseEntity<List<Map<String, Object>>> getSharedFolderClusters(@PathVariable Long folderId) {
        String s3Key = "shared_" + folderId + "/document_clusters_kmeans.json";
        try {
            if (!s3Service.fileExists(s3Key)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }
            String json = s3Service.getFileAsString(s3Key);
            List<Map<String, Object>> clusterList = mapper.readValue(json, new TypeReference<>() {});
            return ResponseEntity.ok(clusterList);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ 공유 폴더 클러스터별 파일 목록
    @GetMapping("/shared-folder-cluster-files/{folderId}/{clusterId}")
    public ResponseEntity<List<String>> getSharedFolderClusterFiles(
            @PathVariable Long folderId, @PathVariable int clusterId) {
        String s3Key = "shared_" + folderId + "/document_clusters_kmeans.json";
        try {
            if (!s3Service.fileExists(s3Key)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }
            String json = s3Service.getFileAsString(s3Key);
            List<Map<String, Object>> clusterList = mapper.readValue(json, new TypeReference<>() {});
            List<String> filesInCluster = new ArrayList<>();
            for (Map<String, Object> item : clusterList) {
                int cluster = (Integer) item.get("cluster");
                if (cluster == clusterId) {
                    filesInCluster.add((String) item.get("filename"));
                }
            }
            return ResponseEntity.ok(filesInCluster);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}