package com.example.synapse.service;

import java.io.*;

public class PythonRunner {

    // ✅ 개인 폴더용
    public static void runPythonScriptForUser(String userId) {
        runPythonWithArgs("--user_id", userId);
    }

    // ✅ 공유 폴더용
    public static void runPythonScriptForSharedFolder(Long folderId) {
        runPythonWithArgs("--shared_folder_id", String.valueOf(folderId));
    }

    private static void runPythonWithArgs(String argName, String value) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "python3", "/Users/mine/Downloads/Synapse_docx_old/main.py", argName, value
            );

            pb.directory(new File("/Users/mine/학교/2025-1학기/캡스톤 디자인/Synapse/backend_spring"));
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Python] " + line);
            }

            int exitCode = process.waitFor();
            System.out.println("Python 종료 코드: " + exitCode);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}