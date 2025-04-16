package com.example.synapse.service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;

@Service
public class PythonRunner {

    @Value("${custom.python-script-path}")
    private String pythonScriptPath;

    @Value("${custom.python-working-dir}")
    private String pythonWorkingDir;

    public void runPythonScript(String userId) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    "python", pythonScriptPath, userId
            );

            pb.directory(new File(pythonWorkingDir));
            pb.redirectErrorStream(true);
            Process process = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[Python] " + line);
                System.out.println("▶ PythonRunner 실행 - userId: " + userId);

            }

            int exitCode = process.waitFor();
            System.out.println("Python 종료 코드: " + exitCode);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}