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
                    "python", "C:/Users/CHS/Desktop/Synapse_docx/main.py", argName, value
            );

            pb.directory(new File("C:/Users/CHS/Desktop/synapse"));
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