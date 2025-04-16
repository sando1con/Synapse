package com.example.synapse.repository;

import com.example.synapse.entity.SharedFolder;
import com.example.synapse.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SharedFolderRepository extends JpaRepository<SharedFolder, Long> {
    List<SharedFolder> findBySharedUsers_IdAndActive(Long userId, boolean active);
    Optional<SharedFolder> findByShareUrl(String shareUrl);

    List<SharedFolder> findByOwner(User owner);
}