import React, { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ForceGraph2D from 'react-force-graph-2d';
import { interpolateRainbow } from 'd3-scale-chromatic';

import '../styles/Home.css';

const Home = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("private");
  const [sharedFolders, setSharedFolders] = useState([]); // 공유폴더 리스트
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedSharedFolderId, setSelectedSharedFolderId] = useState(null);
  const [sharedFolderFiles, setSharedFolderFiles] = useState([]);
  const [myUploadedFiles, setMyUploadedFiles] = useState([]);
  const [privateFiles, setPrivateFiles] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [clusterData, setClusterData] = useState([]);
  const graphWrapperRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const forceGraphRef = useRef();
  const [zoomLevel, setZoomLevel] = useState(1); // 초기값 1
  const [hoverNode, setHoverNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [clusterFolders, setClusterFolders] = useState([]);
  const [selectedClusterFiles, setSelectedClusterFiles] = useState([]);
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeCluster, setActiveCluster] = useState(null);

  const fitAllNodesToScreen = () => {
    if (!forceGraphRef.current || clusterData.length === 0) return;

    const xs = clusterData.map(n => n.x);
    const ys = clusterData.map(n => n.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    const padding = 100;
    const viewWidth = dimensions.width - padding * 2;
    const viewHeight = dimensions.height - padding * 2;

    const zoomFactor = Math.min(
      viewWidth / boxWidth,
      viewHeight / boxHeight,
      5 // 확대 상한선
    );

    const graph = forceGraphRef.current;
    graph.centerAt(centerX, centerY, 800);
    graph.zoom(zoomFactor, 800);
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const fetchClusterData = (userId) => {
    fetch(`http://localhost:8080/api/clusters/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const clusters = Array.from(new Set(data.map(item => item.cluster)));
        const numClusters = clusters.length;
        setClusterFolders(clusters);
        function getClusterColor(index, totalClusters) {
          return interpolateRainbow(index / totalClusters);
        }
        //클라스터 데이터 가공
        const transformed = data.map((item) => {
          const x = item.vector_2d[0] * 200;
          const y = item.vector_2d[1] * 200;
          return {
            id: item.filename,
            cluster: item.cluster,
            x, y,
            fx: x,
            fy: y,
            color: `hsl(${(item.cluster * 45) % 360}, 70%, 50%)`,
          };
        });
        setClusterData(transformed);
        setTimeout(() => {
          forceGraphRef.current?.zoomToFit(400, 100);
        }, 300);
      })
      .catch((err) => console.error("클러스터 JSON 불러오기 실패:", err));
  };

  const fetchAllMyFiles = () => {
    fetch("http://localhost:8080/api/files/my-all", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setMyUploadedFiles(data))
      .catch((err) => console.error("전체 파일 오류:", err));
  };

  const fetchPrivateFiles = () => {
    fetch("http://localhost:8080/api/files/list", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setPrivateFiles(data))
      .catch((err) => console.error("개인 파일 오류:", err));
  };

  const fetchFilesInSharedFolder = (folderId) => {
    if (selectedSharedFolderId === folderId) {
      setSelectedSharedFolderId(null);
      setSharedFolderFiles([]);
      return;
    }

    fetch('http://localhost:8080/api/shared-folders/${folderId}/files', {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setSharedFolderFiles(data);
        setSelectedSharedFolderId(folderId);
      })
      .catch((err) => console.error("공유 폴더 파일 불러오기 실패:", err));
  };

  const handleCreateSharedFolder = () => {
    if (!newFolderName.trim()) {
      alert("폴더 이름을 입력하세요");
      return;
    }

    fetch("http://localhost:8080/api/shared-folders/create?folderName=" + encodeURIComponent(newFolderName), {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        alert(`공유 폴더 생성 성공!\n공유 URL: ${data.url}`);
        setNewFolderName("");
        fetchSharedFolders(); // 새로 고침
      })
      .catch((err) => {
        console.error("공유 폴더 생성 실패:", err);
        alert("공유 폴더 생성 실패");
      });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      alert("모든 항목을 입력하세요.");
      return;
    }

    fetch("http://localhost:8080/api/users/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("비밀번호 변경 실패");
        alert("비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
      })
      .catch(err => {
        alert("비밀번호 변경 실패: 현재 비밀번호가 틀렸습니다.");
      });
  };

  const handleLogout = () => {
    fetch("http://localhost:8080/api/users/logout", {
      method: "POST",
      credentials: "include"
    })
      .then(() => {
        alert("로그아웃 완료");
        window.location.href = "/login"
      })
      .catch(err => console.error("로그아웃 실패:", err));
  };

  const handleDelete = () => {
    if (!window.confirm("정말 계정을 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;

    fetch("http://localhost:8080/api/users/delete", {
      method: "DELETE",
      credentials: "include"
    })
      .then(() => {
        alert("계정이 삭제되었습니다.");
        window.location.href = "/login"
      })
      .catch(err => console.error("계정 삭제 실패:", err));
  };

  const handleDownload = (filename) => {
    if (!userInfo?.userId) {
      alert("로그인이 필요합니다.");
      return;
    }
    const encodedName = encodeURIComponent(filename);
    const encodedUserId = encodeURIComponent(userInfo.userId);
    window.location.href = `http://localhost:8080/api/files/download-by-name?userId=${encodedUserId}&filename=${encodedName}`;
  };  

  const handleDeleteFile = (filename) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    fetch(`http://localhost:8080/api/files/delete-by-name?userId=${userInfo.userId}&filename=${encodeURIComponent(filename)}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          alert("삭제 완료");
          fetchFiles();
          fetchAllMyFiles();
          if (userInfo?.userId) {
            fetchClusterData(userInfo.userId);
          }
        } else {
          res.text().then(text => alert("삭제 실패: " + text));
        }
      })
      .catch((err) => console.error("파일 삭제 에러:", err));
  };

  const handleDeleteSharedFile = (folderId, filename) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    fetch(`http://localhost:8080/api/files/shared-folder/delete-by-name?userId=${userInfo.userId}&folderId=${folderId}&filename=${encodeURIComponent(filename)}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) {
          alert("삭제 완료");
          fetchFilesInSharedFolder(folderId);
          if (userInfo?.userId) {
            fetchClusterData(userInfo.userId);
          }
        } else {
          res.text().then(text => alert(`삭제 실패: ${text}`));
        }
      })
      .catch((err) => console.error("공유 파일 삭제 에러:", err));
  };

  const fetchFiles = () => {
    fetch("http://localhost:8080/api/files/list", {
      method: "GET",
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setFileList(data))
      .catch((err) => console.error("파일 목록 오류:", err));
  };

  const fetchSharedFiles = () => {
    fetch("http://localhost:8080/api/shared-folders/files", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setSharedFiles(data))
      .catch((err) => console.error("공유 폴더 파일 불러오기 실패:", err));
  };

  const fetchSharedFolders = () => {
    fetch("http://localhost:8080/api/shared-folders/my-folders", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setSharedFolders(data))
      .catch((err) => console.error("공유 폴더 불러오기 실패:", err));
  };

  const fetchFilesByCluster = (clusterId) => {
    if (clusterId === selectedClusterId) {
      setSelectedClusterId(null);
      setSelectedClusterFiles([]);
      return;
    }

    if (!userInfo?.userId) {
      alert("로그인 정보가 없습니다.");
      return;
    }

    fetch(`http://localhost:8080/api/cluster-files/${userInfo.userId}/${clusterId}`)
      .then(res => {
        if (!res.ok) throw new Error("파일 목록을 불러오는 데 실패했습니다.");
        return res.json();
      })
      .then(data => {
        setSelectedClusterId(clusterId);
        setSelectedClusterFiles(data);
      })
      .catch(err => {
        console.error("클러스터 파일 불러오기 실패:", err);
        alert("클러스터 파일 불러오기 실패");
      });
  };


  const handleFolderClick = (clusterId) => {
    setActiveCluster(prev => (prev === clusterId ? null : clusterId)); // 토글 열고 닫기

    const clusterNodes = clusterData.filter(n => n.cluster === clusterId);
    if (clusterNodes.length === 0 || !forceGraphRef.current) return;

    const xs = clusterNodes.map(n => n.x);
    const ys = clusterNodes.map(n => n.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;

    const padding = 100;
    const viewWidth = dimensions.width - padding * 2;
    const viewHeight = dimensions.height - padding * 2;

    const zoomFactor = Math.min(viewWidth / boxWidth, viewHeight / boxHeight, 5);

    forceGraphRef.current.centerAt(centerX, centerY, 800);
    forceGraphRef.current.zoom(zoomFactor, 800);
  };

  useEffect(() => {
    if (clusterData.length > 0) {
      fitAllNodesToScreen(); // 자동 줌 실행
    }
  }, [clusterData]);
  useEffect(() => {
    const handleResize = () => fitAllNodesToScreen();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const zoom = forceGraphRef.current?.zoom();
      if (zoom) setZoomLevel(zoom);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userInfo?.userId) {
      fetchClusterData(userInfo.userId);
    }
  }, [userInfo]);

  // ForceGraph 크기 조정
  useEffect(() => {
    const updateSize = () => {
      if (graphWrapperRef.current) {
        const { offsetWidth, offsetHeight } = graphWrapperRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, [isCollapsed]);

  useEffect(() => {
    fetch("http://localhost:8080/api/users/me", {
      credentials: 'include', // 세션 기반 인증일 때 필수!
    })
      .then((res) => {
        if (!res.ok) throw new Error("사용자 정보 불러오기 실패");
        return res.json();
      })
      .then((data) => setUserInfo(data))
      .catch((err) => console.error(err));

    fetchPrivateFiles();  // 📋 내 폴더 탭용
    fetchAllMyFiles();    // 📁 업로드 탭용
    fetchFiles();
    fetchSharedFiles();
    fetchSharedFolders();
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);

    // 업로드 시작 표시
    setIsUploading(true);
    setUploadProgress(0);

    let completed = 0;
    const total = droppedFiles.length;

    droppedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);

      // 공유폴더라면 folderId 전달
      if (selectedFolder !== "private") {
        formData.append("folderId", selectedFolder);
      }

      fetch("http://localhost:8080/api/files/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
        .then((res) => {
          if (res.ok) {
            fetchFiles();
            fetchAllMyFiles();
          } else {
            alert("파일 업로드 실패");
          }
        })
        .catch((err) => console.error("업로드 에러:", err))
        .finally(() => {
          completed += 1;
          setUploadProgress(Math.round((completed / total) * 100));
          if (completed === total) {
            setTimeout(() => {
              setIsUploading(false);
              if (userInfo?.userId) {
                fetchClusterData(userInfo.userId);
              }
            }, 800);
          }
        });
    });
  };

  const handleDragOver = (e) => e.preventDefault();


  return (
    <div className="home-container">
      {/* 왼쪽 사이드바 */}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="toggle-btn" onClick={toggleSidebar}>
          {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </div>
        {/* 펼쳐진 상태일 때: 메뉴 텍스트 포함 */}
        {!isCollapsed && (
          <>
            {/* 이모지 탭을 가로로 정렬 */}
            <div className="emoji-tab-row">
              <div className={`emoji-tab ${activeTab === 0 ? 'active' : ''}`} onClick={() => setActiveTab(0)}>📁</div>
              <div className={`emoji-tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>📋</div>
              <div className={`emoji-tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>🤝</div>
              <div className={`emoji-tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>👤</div>
            </div>

            <div className="sidebar-content">
              {activeTab === 0 && (
                <div className="upload-area">

                  {/* ✅ 업로드할 폴더 선택 드롭다운 */}
                  <div className="folder-select">
                    <label htmlFor="folder">📁 업로드할 폴더 선택:</label>
                    <select
                      id="folder"
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                    >
                      <option value="private">내 개인 폴더</option>
                      {sharedFolders.map(folder => (
                        <option key={folder.id} value={folder.id}>🤝 {folder.folderName}</option>
                      ))}
                    </select>
                  </div>
                  {/* 드래그 앤 드롭 영역 */}
                  <div
                    className="dropzone"
                    onDrop={(e) => handleDrop(e)}
                    onDragOver={handleDragOver}
                  >
                    <h3>📂 Drag & Drop</h3>
                    <p>또는 파일을 선택하세요 (최대 50MB)</p>
                  </div>

                  {isUploading && (
                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${uploadProgress}%` }}>
                        {uploadProgress}%
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === 1 && (
                <div className="upload-area">
                  <h3>📋 내 폴더 클러스터링 결과</h3>

                  {clusterData.length === 0 ? (
                    <p>클러스터링된 데이터가 없습니다.</p>
                  ) : (
                    <>
                      {[...new Set(clusterData.map(item => item.cluster))].map(clusterNum => (
                        <div key={clusterNum} style={{ marginBottom: '20px' }}>
                          {/* 폴더 제목 */}
                          <h4
                            style={{ cursor: 'pointer', color: '#f0f0f0', fontWeight: 'bold' }}
                            onClick={() => handleFolderClick(clusterNum)}
                          >
                            📂 폴더 {clusterNum}
                          </h4>

                          {/* 해당 폴더가 열린 상태일 때만 파일 표시 */}
                            {activeCluster === clusterNum && (
                              <ul className="file-list">
                                {clusterData.filter(file => file.cluster === clusterNum).map(file => (
                                  <li key={file.id} className="file-item">
                                    <span>{file.id}</span>
                                    <button onClick={() => handleDownload(file.id)}>다운로드</button>
                                    <button onClick={() => handleDeleteFile(file.id)}>삭제</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {activeTab === 2 && (
                <div className="upload-area">
                  <h3>🤝 공유 폴더 파일</h3>

                  <div className="create-shared-folder">
                    <input
                      type="text"
                      placeholder="새 공유 폴더 이름"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                    <button onClick={handleCreateSharedFolder}>생성</button>
                  </div>

                  <div className="shared-folder-scroll-box">
                    <ul className="shared-folder-list">
                      {sharedFolders.map((folder) => (
                        <li key={folder.id} className="shared-folder-item">
                          <span onClick={() => fetchFilesInSharedFolder(folder.id)}>
                            📁 {folder.folderName}
                          </span>
                          {/* Button to reveal the shareable URL */}
                          <button
                            onClick={() => {
                              const shareableUrl = `http://localhost:3000/shared/${folder.shareUrl}`;
                              navigator.clipboard.writeText(shareableUrl);
                              alert(`공유 URL이 클립보드에 복사되었습니다: ${shareableUrl}`);
                            }}
                          >
                            공유 URL 복사
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* ✅ 선택된 공유폴더의 파일 보여주기 */}
                  {selectedSharedFolderId && (
                    <>
                      <h4>📂 {sharedFolders.find(f => f.id == selectedSharedFolderId)?.folderName}의 파일들</h4>
                      <div className="shared-folder-file-scroll-box">
                        <ul className="file-list">
                          {sharedFolderFiles.length === 0 ? (
                            <li>📭 파일이 없습니다.</li>
                          ) : (
                            sharedFolderFiles.map(file => (
                              <li key={file.id} className="file-item">
                                <span>{file.filename} ({(file.size / 1024).toFixed(1)} KB)</span>
                                <button onClick={() => handleDownload(file.filename)}>다운로드</button>
                                <button onClick={() => handleDeleteSharedFile(selectedSharedFolderId, file.id)}>삭제</button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab === 3 && (
                <div className="upload-area">
                  <h3>👤 마이페이지</h3>
                  {userInfo ? (
                    <div className="user-info">
                      <p><strong>이름:</strong> {userInfo.username}</p>
                      <p><strong>아이디:</strong> {userInfo.userId}</p>
                      <p><strong>역할:</strong> {userInfo.role}</p>

                      {/* 🔐 비밀번호 변경 토글 버튼 */}
                      <button className="button change" onClick={() => setShowPasswordForm(prev => !prev)}>
                        {showPasswordForm ? "비밀번호 변경 취소" : "비밀번호 변경하기"}
                      </button>
                      {/* 🔐 비밀번호 변경 폼 (보일 때만) */}
                      {showPasswordForm && (
                        <div className="password-change">
                          <input
                            type="password"
                            placeholder="현재 비밀번호"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <input
                            type="password"
                            placeholder="새 비밀번호"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button className="button change" onClick={handleChangePassword}>확인</button>
                        </div>
                      )}
                      {/* 로그아웃 & 탈퇴 */}
                      <button className="button logout" onClick={handleLogout}>로그아웃</button>
                      <button className="button delete" onClick={handleDelete}>계정 탈퇴</button>
                    </div>
                  ) : (
                    <p>사용자 정보를 불러오는 중...</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

       {/* 오른쪽 시각화 영역 */}
       <div className="main-area" ref={graphWrapperRef}>
        <div className="top-right-controls">
          <button onClick={fitAllNodesToScreen}>🔄 전체 보기</button>
        </div>
        <ForceGraph2D
          enableNodeDrag={false} // ✨ 이거 하나로 끌기 비활성화!(노드 수정 불가)
          ref={forceGraphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={{ nodes: clusterData, links: [] }}
          nodeId="id"
          nodeLabel={null}
          d3Force="charge"
          d3VelocityDecay={0.2}         // 관성 약하게 해서 안정적으로 배치
          d3ForceCharge={-10}
          nodeColor={(node) => node.color}
          nodeCanvasObject={(node, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

          }}

          nodeCanvasObjectMode={() => "after"}
          enableZoomPanInteraction={true}
          //flag
          onZoom={(zoom) => setTimeout(() => setZoomLevel(zoom), 0)}


          onNodeClick={(node) => {
            if (node && node.cluster !== undefined) {
              handleFolderClick(node.cluster); // 2️⃣ 클릭한 노드의 폴더 자동 열기
            }
          }
          }
          onNodeHover={(node) => { //flag
            if (node) {
              const coords = forceGraphRef.current?.graph2ScreenCoords(node.x, node.y);
              if (coords) {
                setTooltipPos({ x: coords.x, y: coords.y });
                setHoverNode(node);
              }
            } else {
              setHoverNode(null);
            }
          }}



        />
        {hoverNode && ( //flag
          <div
            className="tooltip"
            style={{
              position: 'absolute',
              top: tooltipPos.y + 10 + 'px',
              left: tooltipPos.x + 'px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              padding: '6px 10px',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              fontSize: '0.9rem',
            }}
          >
            <strong>{hoverNode.id}</strong><br />
            📂 클러스터 {hoverNode.cluster}
            <img
              src={`http://localhost:8080/api/preview?userId=${userInfo.userId}&filename=${hoverNode.id}`}
              style={{ width: "300px", height: "auto", marginTop: "10px", borderRadius: "4px", boxShadow: "0 0 8px rgba(0,0,0,0.1)" }}
              alt="미리보기"
            />

          </div>
        )}


      </div>
    </div>
  );
};

export default Home;
