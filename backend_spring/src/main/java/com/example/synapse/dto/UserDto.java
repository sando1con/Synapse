package com.example.synapse.dto;

import com.example.synapse.entity.User;
import lombok.Getter;

@Getter
public class UserDto {
    private String username;
    private String userId;
    private String role;

    public UserDto(User user) {
        this.username = user.getUsername();
        this.userId = user.getUserId();
        this.role = user.getRole();
    }
}