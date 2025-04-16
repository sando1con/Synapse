package com.example.synapse.repository;

import com.example.synapse.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<FileEntity, Long> {
    List<FileEntity> findByUser_Id(Long userId);
    List<FileEntity> findBySharedFolder_Id(Long folderId);
    Optional<FileEntity> findByFilenameAndUser_UserIdAndSharedFolderIsNull(String filename, String userId);
    List<FileEntity> findByFilename(String filename);
    List<FileEntity> findByUser_IdAndSharedFolderIsNull(Long id);
    Optional<FileEntity> findByFilenameAndSharedFolder_IdAndUser_UserId(String filename, Long folderId, String userId);
}