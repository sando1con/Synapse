package com.example.synapse.service;

import java.io.*;

public class PythonRunner {
    public static void runPythonScript(String userId) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "python", "C:/Users/gksrn/Desktop/Synapse_docx/main.py", userId
            );

            pb.directory(new File("C:/Users/gksrn/Downloads/synapse/synapse"));
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