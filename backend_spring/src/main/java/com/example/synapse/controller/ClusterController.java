package com.example.synapse.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.*;
import java.nio.file.*;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:3000")
public class ClusterController {

    @GetMapping("/clusters/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getUserClusters(@PathVariable String userId) {
        try {
            // 🔽 사용자별 클러스터링 결과 파일 경로
            Path filePath = Paths.get("uploaded_files", "user_" + userId, "document_clusters_kmeans.json");

            File jsonFile = filePath.toFile();
            if (!jsonFile.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Collections.emptyList());
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> clusterList = mapper.readValue(
                    jsonFile,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(clusterList);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    @GetMapping("/cluster-files/{userId}/{clusterId}")
    public ResponseEntity<List<String>> getFilesByUserAndCluster(
            @PathVariable String userId,
            @PathVariable int clusterId) {
        try {
            // 사용자별 클러스터링 결과 경로
            Path filePath = Paths.get("uploaded_files", "user_" + userId, "document_clusters_kmeans.json");

            File jsonFile = filePath.toFile();
            if (!jsonFile.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> clusterList = mapper.readValue(jsonFile, new TypeReference<>() {});

            List<String> filesInCluster = new ArrayList<>();
            for (Map<String, Object> item : clusterList) {
                int cluster = (Integer) item.get("cluster");
                if (cluster == clusterId) {
                    filesInCluster.add((String) item.get("filename"));
                }
            }

            return ResponseEntity.ok(filesInCluster);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // 🔽 공유 폴더용 클러스터링 결과 가져오기
    @GetMapping("/shared-folder-clusters/{folderId}")
    public ResponseEntity<List<Map<String, Object>>> getSharedFolderClusters(@PathVariable Long folderId) {
        try {
            Path filePath = Paths.get("uploaded_files", "shared_" + folderId, "document_clusters_kmeans.json");

            File jsonFile = filePath.toFile();
            if (!jsonFile.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> clusterList = mapper.readValue(
                    jsonFile,
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(clusterList);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/shared-folder-cluster-files/{folderId}/{clusterId}")
    public ResponseEntity<List<String>> getSharedFolderClusterFiles(
            @PathVariable Long folderId,
            @PathVariable int clusterId) {
        try {
            Path filePath = Paths.get("uploaded_files", "shared_" + folderId, "document_clusters_kmeans.json");

            File jsonFile = filePath.toFile();
            if (!jsonFile.exists()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> clusterList = mapper.readValue(jsonFile, new TypeReference<>() {});

            List<String> filesInCluster = new ArrayList<>();
            for (Map<String, Object> item : clusterList) {
                int cluster = (Integer) item.get("cluster");
                if (cluster == clusterId) {
                    filesInCluster.add((String) item.get("filename"));
                }
            }

            return ResponseEntity.ok(filesInCluster);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}