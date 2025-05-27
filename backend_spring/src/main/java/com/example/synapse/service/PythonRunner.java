package com.example.synapse.service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class PythonRunner {

    private static final String FASTAPI_ENDPOINT = "http://3.85.193.34:8080/analyze"; // ← EC2 IP로 교체

    public static void runPythonScriptForUser(String userId) {
        String json = "{\"user_id\": \"" + userId + "\"}";
        sendAnalyzeRequest(json);
    }

    public static void runPythonScriptForSharedFolder(Long folderId, String userId) {
        String json = String.format("{\"user_id\": \"%s\", \"shared_id\": \"%s\"}", userId, folderId);
        sendAnalyzeRequest(json);
    }

    private static void sendAnalyzeRequest(String jsonPayload) {
        try {
            URL url = new URL(FASTAPI_ENDPOINT);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes());
                os.flush();
            }

            int code = conn.getResponseCode();
            System.out.println("[FastAPI] 응답 코드: " + code);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}