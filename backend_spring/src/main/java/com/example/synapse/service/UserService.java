package com.example.synapse.service;

import org.springframework.transaction.annotation.Transactional;
import com.example.synapse.entity.User;
import com.example.synapse.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.synapse.entity.SharedFolder;
import com.example.synapse.entity.FileEntity;
import com.example.synapse.repository.SharedFolderRepository;
import com.example.synapse.repository.FileRepository;


import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SharedFolderRepository sharedFolderRepository;

    @Autowired
    private FileRepository fileRepository;

    // 회원가입
    public User registerUser(User user) {
        if (userRepository.findByUserId(user.getUserId()).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }
        return userRepository.save(user);
    }

    // 로그인
    public User login(String userId, String password) {
        return userRepository.findByUserId(userId)
                .filter(user -> user.getPassword().equals(password))
                .orElse(null);
    }

    // userId로 사용자 찾기 (마이페이지용)
    public User findByUserId(String userId) {
        return userRepository.findByUserId(userId).orElse(null);
    }

    @Transactional
    public void deleteByUserId(String userId) {
        User user = userRepository.findByUserId(userId).orElseThrow();

        // 공유 폴더 사용자 연관 삭제
        for (SharedFolder folder : user.getSharedFolders()) {
            folder.getSharedUsers().remove(user);
            sharedFolderRepository.save(folder); // ← 이것도 중요!
        }

        // 연관된 파일들 먼저 삭제 (선택)
        List<FileEntity> userFiles = fileRepository.findByUser_Id(user.getId());
        fileRepository.deleteAll(userFiles);

        // 마지막으로 유저 삭제
        userRepository.delete(user);
    }

    @Transactional
    public boolean changePassword(String userId, String currentPassword, String newPassword) {
        Optional<User> optionalUser = userRepository.findByUserId(userId);

        if (optionalUser.isPresent()) {
            User user = optionalUser.get();

            if (!user.getPassword().equals(currentPassword)) {
                return false; // 현재 비밀번호 틀림
            }

            user.setPassword(newPassword); // 새 비밀번호로 변경
            return true;
        }

        return false;
    }
}