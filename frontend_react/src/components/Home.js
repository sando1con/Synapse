import React, { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ForceGraph2D from 'react-force-graph-2d';
import { forceManyBody, forceCollide } from 'd3-force';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom'; // ✅ 추가

import '../styles/Home.css';

const Home = () => {
  const navigate = useNavigate(); // ✅ 추가

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
  const [sharedClusterData, setSharedClusterData] = useState([]);
  const [activeSharedCluster, setActiveSharedCluster] = useState(null);
  const [activeFolderType, setActiveFolderType] = useState("private"); // "private" or "shared"
  const [searchTerm, setSearchTerm] = useState("");  // 🔍 검색어 상태
  const [overwritePrompt, setOverwritePrompt] = useState(null); // { file, folderId, resolve, reject }
  const [dimmedNodes, setDimmedNodes] = useState([]);
  const [isSearching, setIsSearching] = useState(false); // 🔍 검색 중 여부
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm, onCancel }
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);  // 🔍 분석 상태
  const [clusterSource, setClusterSource] = useState("none"); // "private", "shared", "none"
  const [groupBy, setGroupBy] = useState("category"); // 또는 "extension"
  const [sharedGroupBy, setSharedGroupBy] = useState("category"); // "category" | "extension"
  const [searchResults, setSearchResults] = useState([]); // 🔍 검색된 파일만 따로 추적

  const handleCopyUrl = (shareableUrl) => {
    // 1️⃣ 최신 API 시도
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareableUrl)
        .then(() => {
          toast.success("📋 공유 URL이 복사되었습니다!");
        })
        .catch((err) => {
          console.error("❌ 최신 복사 실패:", err);
          fallbackCopyToClipboard(shareableUrl);
        });
    } else {
      // 2️⃣ fallback으로 복사 시도
      fallbackCopyToClipboard(shareableUrl);
    }
  };

  // ✅ fallback: input 생성 → 복사 → 제거
  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // 화면에서 보이지 않게 위치 지정
    textArea.style.position = "fixed";
    textArea.style.top = "-1000px";
    textArea.style.left = "-1000px";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success("📋 공유 URL이 복사되었습니다!");
      } else {
        toast.error("❌ 복사 실패");
      }
    } catch (err) {
      console.error("❌ 복사 오류:", err);
      toast.error("❌ 복사 실패");
    }

    document.body.removeChild(textArea);
  };

  const getExtension = (filename) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "기타";
  };

  const groupFiles = (files) => {
    const grouped = {};
    files.forEach(file => {
      const key = groupBy === "extension"
        ? getExtension(file.id || file.filename)
        : file.super_category || `폴더 ${file.cluster}`;

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(file);
    });
    return grouped;
  };

  const groupSharedFiles = (files) => {
    if (sharedGroupBy === "extension") {
      const map = {};
      files.forEach((f) => {
        const ext = f.filename.split('.').pop().toLowerCase();
        if (!map[ext]) map[ext] = [];
        map[ext].push(f);
      });
      return map;
    } else {
      const map = {};
      files.forEach((f) => {
        const category = f.super_category ?? `클러스터 ${f.cluster}`;
        if (!map[category]) map[category] = [];
        map[category].push(f);
      });
      return map;
    }
  };

  const handleSearch = () => {
    const lowerSearch = searchTerm.toLowerCase();
    setIsSearching(true);  // ✅ 검색 시작

    if (activeTab === 1) {
      const filtered = clusterData.filter(file =>
        file.type === 'file' &&
        (
          file.id?.toLowerCase().includes(lowerSearch) ||
          file.category?.toLowerCase().includes(lowerSearch) ||
          file.super_category?.toLowerCase().includes(lowerSearch)
        )
      );
      setSelectedClusterFiles(filtered);
      setSearchResults(filtered); // ✅ 강조용 결과 저장
      if (filtered.length > 0) {
        const groupName = groupBy === "extension"
          ? getExtension(filtered[0].id)
          : filtered[0].super_category || `폴더 ${filtered[0].cluster}`;
        setActiveCluster(groupName);
      }

      const matchedIds = new Set(filtered.map(f => f.id));
      setDimmedNodes(clusterData.filter(n => !matchedIds.has(n.id)).map(n => n.id));
    }

    else if (activeTab === 2) {
      const filtered = sharedClusterData.filter(file =>
        file.filename?.toLowerCase().includes(lowerSearch) ||
        file.category?.toLowerCase().includes(lowerSearch) ||
        file.super_category?.toLowerCase().includes(lowerSearch)
      );
      setSelectedClusterFiles(filtered);
      setSearchResults(filtered); // ✅ 강조용 결과 저장
      if (filtered.length > 0) {
        const groupName = sharedGroupBy === "extension"
          ? getExtension(filtered[0].filename)
          : filtered[0].super_category || `클러스터 ${filtered[0].cluster}`;
        setActiveSharedCluster(groupName);
      }

      const matchedIds = new Set(filtered.map(f => f.filename));
      setDimmedNodes(clusterData.filter(n => !matchedIds.has(n.id)).map(n => n.id));
    }
  };

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

    const padding = 10;
    const viewWidth = dimensions.width - padding * 2;
    const viewHeight = dimensions.height - padding * 2;

    const zoomFactor = Math.min(
      viewWidth / boxWidth,
      viewHeight / boxHeight,
      5 // 확대 상한선
    );

    const graph = forceGraphRef.current;
    const sidebarWidth = document.querySelector('.sidebar')?.offsetWidth || 0;
    const adjustedCenterX = centerX - (isCollapsed ? 0 : sidebarWidth / 4.0);
    graph.centerAt(adjustedCenterX, centerY, 800);
    graph.zoom(zoomFactor, 800);

    //setDimmedNodes([]);     // 🔥 흐림 초기화
    //setIsSearching(false);  // 🔥 검색 상태도 종료
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const fetchClusterData = (userId) => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/clusters/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const clusters = Array.from(new Set(data.map(item => item.cluster)));
        clusters.sort((a, b) => a - b);

        const clusterSizes = new Map();
        clusters.forEach(clusterId => {
          const count = data.filter(item => item.cluster === clusterId).length;
          clusterSizes.set(clusterId, count);
        });

        const maxSize = Math.max(...clusterSizes.values());
        const minSize = Math.min(...clusterSizes.values());

        const angleStep = (2 * Math.PI) / clusters.length;
        const minRadius = 200;
        const maxRadius = 500;

        const clusterCenters = clusters.map((clusterId, i) => {
          const angle = i * angleStep;
          const size = clusterSizes.get(clusterId);
          const norm = (size - minSize) / (maxSize - minSize + 0.001);
          const radius = minRadius + Math.sqrt(norm) * (maxRadius - minRadius);
          return {
            clusterId,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          };
        });

        const generateHslColors = (count) => {
          const colors = [];
          for (let i = 0; i < count; i++) {
            const hue = (i * 360) / count;
            colors.push(`hsl(${hue}, 60%, 60%)`);
          }
          return colors;
        };

        const clusterColors = generateHslColors(clusters.length);
        const getColorByClusterId = (clusterId) => {
          const index = clusters.indexOf(clusterId);
          return clusterColors[index % clusterColors.length];
        };

        const vectorScale = 200;
        const fileNodes = data.map((item) => {
          const x = item.vector_2d[0] * vectorScale;
          const y = item.vector_2d[1] * vectorScale;

          return {
            id: item.filename,
            type: "file",
            cluster: item.cluster,
            super_category: item.super_category ?? null,
            x,
            y,
            fx: x,
            fy: y,
            color: getColorByClusterId(item.cluster),
          };
        });

        const clusterNodes = clusters.map((clusterId, i) => {
          const clusterFiles = fileNodes.filter(f => f.cluster === clusterId);
          const centerX = clusterFiles.reduce((sum, f) => sum + f.x, 0) / clusterFiles.length;
          const centerY = clusterFiles.reduce((sum, f) => sum + f.y, 0) / clusterFiles.length;
          const superCategory = clusterFiles.find(f => f.super_category)?.super_category ?? null;

          return {
            id: `cluster_${clusterId}`,
            type: "cluster",
            cluster: clusterId,
            super_category: superCategory,
            x: centerX,
            y: centerY,
            color: getColorByClusterId(clusterId),
          };
        });

        const avgX = clusterNodes.reduce((sum, node) => sum + node.x, 0) / clusterNodes.length;
        const avgY = clusterNodes.reduce((sum, node) => sum + node.y, 0) / clusterNodes.length;
        const userNode = {
          id: `user_${userId}`,
          type: "user",
          label: userId,
          fx: avgX,
          fy: avgY,
          x: avgX,
          y: avgY,
          color: "hsl(0, 0%, 100%)",
        };

        const links = [];
        clusterNodes.forEach(cluster => {
          links.push({ source: userNode.id, target: cluster.id });
        });
        fileNodes.forEach(file => {
          links.push({ source: `cluster_${file.cluster}`, target: file.id });
        });

        setClusterData([userNode, ...clusterNodes, ...fileNodes]);
        forceGraphRef.current._custom_links = links;
        setTimeout(() => {
          forceGraphRef.current?.zoomToFit(400, 100);
        }, 300);
      })
      .catch((err) => console.error("클러스터 JSON 불러오기 실패:", err));
  };

  const fetchAllMyFiles = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/files/my-all`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setMyUploadedFiles(data))
      .catch((err) => console.error("전체 파일 오류:", err));
  };

  const fetchPrivateFiles = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/files/list`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setPrivateFiles(data))
      .catch((err) => console.error("개인 파일 오류:", err));
  };

  const fetchFilesInSharedFolder = (folderId) => {
    if (selectedSharedFolderId === folderId) {
      // ✅ 다시 클릭 시 → 공유폴더 선택 해제 + 개인 그래프 다시 불러오기
      setSelectedSharedFolderId(null);
      setSharedFolderFiles([]);
      setSharedClusterData([]);
      setActiveFolderType("private"); // 개인 폴더로 전환
      if (userInfo?.userId) {
        fetchClusterData(userInfo.userId); // 개인 클러스터 다시 불러오기
        setClusterSource("private"); // ✅ 추가
      }
      return;
    }

    // ✅ 새 공유폴더 선택
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/${folderId}/files`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setSharedFolderFiles(data);
        setSelectedSharedFolderId(folderId);
        setActiveFolderType("shared");
        fetchSharedFolderClusterData(folderId);
        setClusterSource("shared"); // ✅ 추가
      })
      .catch((err) => console.error("공유 폴더 파일 불러오기 실패:", err));
  };

  const handleCreateSharedFolder = () => {
    if (!newFolderName.trim()) {
      toast.warn("📁 폴더 이름을 입력하세요.");
      return;
    }

    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/create?folderName=` + encodeURIComponent(newFolderName), {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        toast.success(`✅ 공유 폴더 생성 성공!\n`);
        setNewFolderName("");
        fetchSharedFolders(); // 새로 고침
      })
      .catch((err) => {
        console.error("공유 폴더 생성 실패:", err);
        toast.error("❌ 공유 폴더 생성 실패");
      });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      toast.warn("❗ 모든 항목을 입력하세요.");
      return;
    }

    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/change-password`, {
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
        toast.success("🔐 비밀번호가 변경되었습니다.");
        setCurrentPassword("");
        setNewPassword("");
      })
      .catch(err => {
        toast.error("❌ 현재 비밀번호가 틀렸습니다.");
      });
  };

  const handleLogout = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/logout`, {
      method: "POST",
      credentials: "include"
    })
      .then(() => {
        toast.success("👋 로그아웃 완료");
        window.location.href = "/login"
      })
      .catch(err => toast.error("로그아웃 실패:", err));
  };

  const handleDelete = () => {
    setConfirmModal({
      message: "정말 계정을 삭제하시겠습니까? 되돌릴 수 없습니다.",
      onConfirm: () => {
        setIsModalLoading(true); // ✅ 로딩 시작 표시
        fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/delete`, {
          method: "DELETE",
          credentials: "include"
        })
          .then(() => {
            toast.success("✅ 계정이 삭제되었습니다.");
            setTimeout(() => window.location.href = "/login", 1000);
          })
          .catch(err => toast.error("❌ 계정 삭제 실패"))
          .finally(() => {
            setIsModalLoading(false); // ✅ 로딩 종료
            setConfirmModal(null);    // ✅ 모달 닫기
          });
      },
      onCancel: () => {
        setConfirmModal(null);
        setIsModalLoading(false); // ✅ 취소 시도 로딩 해제
      },
    });
  };

  const handleDownload = (filename) => {
    if (!userInfo?.userId) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    const encodedName = encodeURIComponent(filename);
    const encodedUserId = encodeURIComponent(userInfo.userId);

    // 공유 폴더라면 folderId도 같이 보냄
    let downloadUrl = `${process.env.REACT_APP_API_BASE_URL}/api/files/download-by-name?userId=${encodedUserId}&filename=${encodedName}`;
    if (activeFolderType === "shared" && selectedSharedFolderId) {
      downloadUrl += `&folderId=${selectedSharedFolderId}`;
    }

    window.location.href = downloadUrl;
  };

  const handleDeleteFile = (filename) => {
    setConfirmModal({
      message: `정말로 "${filename}" 파일을 삭제하시겠습니까?`,
      onConfirm: () => {
        setIsModalLoading(true); // ✅ 먼저 로딩 상태 true 설정

        // ✅ 한 프레임 뒤에 fetch 실행 → UI 반영 시간 확보
        setTimeout(() => {
          fetch(`${process.env.REACT_APP_API_BASE_URL}/api/files/delete-by-name?userId=${userInfo.userId}&filename=${encodeURIComponent(filename)}`, {
            method: "DELETE",
            credentials: "include",
          })
            .then((res) => {
              if (res.ok) {
                toast.success("🗑️ 삭제 완료");
                fetchFiles();
                fetchAllMyFiles();
                if (userInfo?.userId) {
                  fetchClusterData(userInfo.userId);
                }
              } else {
                res.text().then(text => toast.error("삭제 실패: " + text));
              }
            })
            .catch((err) => toast.error("파일 삭제 에러:", err))
            .finally(() => {
              setIsModalLoading(false); // ✅ 로딩 종료
              setConfirmModal(null);    // ✅ 모달 닫기
            });
        }, 0);
      },
      onCancel: () => {
        setConfirmModal(null);
        setIsModalLoading(false); // ✅ 취소 시에도 로딩 해제
      },
    });
  };

  const fetchSharedFolderFilesOnly = (folderId) => {
    return fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/${folderId}/files`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setSharedFolderFiles(data);
      })
      .catch((err) => console.error("공유 폴더 파일만 불러오기 실패:", err));
  };

  const handleDeleteSharedFile = (folderId, filename) => {
    setConfirmModal({
      message: `정말로 공유 파일 "${filename}"을 삭제하시겠습니까?`,
      onConfirm: () => {
        setIsModalLoading(true); // ✅ 로딩 시작

        setTimeout(() => {
          fetch(`${process.env.REACT_APP_API_BASE_URL}/api/files/shared-folder/delete-by-name?userId=${userInfo.userId}&folderId=${folderId}&filename=${encodeURIComponent(filename)}`, {
            method: "DELETE",
            credentials: "include",
          })
            .then((res) => {
              if (res.ok) {
                toast.success("🗑️ 삭제 완료");

                const prevGroup = activeSharedCluster;
                fetchSharedFolderFilesOnly(folderId);
                // 공유폴더 파일 삭제시 별도 갱신
                if (userInfo?.userId && activeFolderType === "shared") {
                  fetchSharedFolderClusterData(folderId).then(() => {
                    setTimeout(() => {
                      setActiveSharedCluster(prevGroup);
                    }, 100);
                  });
                }
              } else {
                res.text().then(text => toast.error(`삭제 실패: ${text}`));
              }
            })
            .catch((err) => toast.error("공유 파일 삭제 에러:", err))
            .finally(() => {
              setIsModalLoading(false); // ✅ 로딩 종료
              setConfirmModal(null);    // ✅ 모달 닫기
            });
        }, 0);
      },
      onCancel: () => {
        setConfirmModal(null);
        setIsModalLoading(false); // ✅ 취소 시에도 로딩 해제
      },
    });
  };

  const handleDeleteSharedFolder = (folderId) => {
    const folderName = sharedFolders.find(f => f.id === folderId)?.folderName;
    setConfirmModal({
      message: `정말로 공유 폴더 "${folderName}"를 삭제하시겠습니까?`,
      onConfirm: () => {
        setIsModalLoading(true); // ✅ 로딩 시작

        setTimeout(() => {
          fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/delete/${folderId}`, {
            method: "DELETE",
            credentials: "include",
          })
            .then((res) => {
              if (!res.ok) throw new Error("삭제 실패");
              toast.success("✅ 공유 폴더 삭제 완료");
              fetchSharedFolders();

              // ✅ 이 부분 추가
              if (selectedSharedFolderId === folderId) {
                setSelectedSharedFolderId(null);
                setSharedFolderFiles([]);
                setSharedClusterData([]);
                setClusterData([]);
                setActiveSharedCluster(null);
                setActiveFolderType("private");
                setClusterSource("none");
              }
            })
            .catch((err) => {
              console.error("공유 폴더 삭제 실패:", err);
              toast.error("공유 폴더 삭제 실패");
            })
            .finally(() => {
              setIsModalLoading(false); // ✅ 로딩 종료
              setConfirmModal(null);    // ✅ 모달 닫기
            });
        }, 0);
      },
      onCancel: () => {
        setConfirmModal(null);
        setIsModalLoading(false); // ✅ 취소 시에도 로딩 해제
      },
    });
  };

  const fetchFiles = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/files/list`, {
      method: "GET",
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setFileList(data))
      .catch((err) => console.error("파일 목록 오류:", err));
  };

  const fetchSharedFiles = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/files`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setSharedFiles(data))
      .catch((err) => console.error("공유 폴더 파일 불러오기 실패:", err));
  };

  const fetchSharedFolders = () => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folders/my-folders`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => setSharedFolders(data))
      .catch((err) => console.error("공유 폴더 불러오기 실패:", err));
  };

  const fetchSharedFolderClusterData = (folderId) => {
    return fetch(`${process.env.REACT_APP_API_BASE_URL}/api/shared-folder-clusters/${folderId}`)
      .then((res) => res.json())
      .then((data) => {
        setSharedClusterData(data);

        const clusters = Array.from(new Set(data.map(item => item.cluster)));
        clusters.sort((a, b) => a - b);

        const clusterSizes = new Map();
        clusters.forEach(clusterId => {
          const count = data.filter(item => item.cluster === clusterId).length;
          clusterSizes.set(clusterId, count);
        });

        const maxSize = Math.max(...clusterSizes.values());
        const minSize = Math.min(...clusterSizes.values());

        const angleStep = (2 * Math.PI) / clusters.length;
        const minRadius = 200;
        const maxRadius = 500;

        const clusterCenters = clusters.map((clusterId, i) => {
          const angle = i * angleStep;
          const size = clusterSizes.get(clusterId);
          const norm = (size - minSize) / (maxSize - minSize + 0.001);
          const radius = minRadius + Math.sqrt(norm) * (maxRadius - minRadius);

          return {
            clusterId,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          };
        });

        const generateHslColors = (count) => {
          const colors = [];
          for (let i = 0; i < count; i++) {
            const hue = (i * 360) / count;
            colors.push(`hsl(${hue}, 60%, 60%)`);
          }
          return colors;
        };

        const clusterColors = generateHslColors(clusters.length);
        const getColorByClusterId = (clusterId) => {
          const index = clusters.indexOf(clusterId);
          return clusterColors[index % clusterColors.length];
        };

        const vectorScale = 200;
        const fileNodes = data.map((item) => {
          const x = item.vector_2d[0] * vectorScale;
          const y = item.vector_2d[1] * vectorScale;
          return {
            id: item.filename,
            type: "file",
            cluster: item.cluster,
            super_category: item.super_category ?? null,
            x,
            y,
            fx: x,
            fy: y,
            color: getColorByClusterId(item.cluster),
          };
        });

        const clusterNodes = clusters.map((clusterId) => {
          const clusterFiles = fileNodes.filter(f => f.cluster === clusterId);
          const centerX = clusterFiles.reduce((sum, f) => sum + f.x, 0) / clusterFiles.length;
          const centerY = clusterFiles.reduce((sum, f) => sum + f.y, 0) / clusterFiles.length;
          const superCategory = clusterFiles.find(f => f.super_category)?.super_category ?? null;

          return {
            id: `cluster_${clusterId}`,
            type: "cluster",
            cluster: clusterId,
            super_category: superCategory,
            x: centerX,
            y: centerY,
            fx: centerX,
            fy: centerY,
            color: getColorByClusterId(clusterId),
          };
        });

        const avgX = clusterNodes.reduce((sum, node) => sum + node.x, 0) / clusterNodes.length;
        const avgY = clusterNodes.reduce((sum, node) => sum + node.y, 0) / clusterNodes.length;
        const userNode = {
          id: `user_shared_${folderId}`,
          type: "user",
          label: `shared_${folderId}`,
          x: avgX,
          y: avgY,
          fx: avgX,
          fy: avgY,
          color: "hsl(0, 0%, 100%)",
        };

        const allNodes = [userNode, ...clusterNodes, ...fileNodes];

        const links = [];
        clusterNodes.forEach(cluster => {
          links.push({ source: userNode.id, target: cluster.id });
        });
        fileNodes.forEach(file => {
          links.push({ source: `cluster_${file.cluster}`, target: file.id });
        });

        setClusterData(allNodes);
        forceGraphRef.current._custom_links = links;

        setTimeout(() => {
          forceGraphRef.current?.zoomToFit(400, 100);
        }, 300);
      })
      .catch((err) => console.error("공유 클러스터 JSON 실패:", err));
  };


  const fetchFilesByCluster = (clusterId) => {
    if (clusterId === selectedClusterId) {
      setSelectedClusterId(null);
      setSelectedClusterFiles([]);
      return;
    }

    if (!userInfo?.userId) {
      toast.error("로그인 정보가 없습니다.");
      return;
    }

    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/cluster-files/${userInfo.userId}/${clusterId}`)
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
        toast.error("클러스터 파일 불러오기 실패");
      });
  };

  const handleFolderClick = (clusterId, groupName = null, shouldZoom = true) => {
    if (activeFolderType === "shared") {
      const files = sharedClusterData.filter(f => f.cluster === clusterId);
      const name = groupName ?? (
        sharedGroupBy === 'extension'
          ? getExtension(files[0]?.filename)
          : files[0]?.super_category ?? `클러스터 ${clusterId}`
      );
      setActiveSharedCluster(name);
      setSelectedClusterFiles(files);

      // 🔥 이거 추가해라!
      if (activeTab !== 2) {
        setActiveTab(2);
      }
      if (isCollapsed) {
        setIsCollapsed(false);
      }

    } else {
      const files = clusterData.filter(f => f.type === 'file' && f.cluster === clusterId);
      const name = groupName ?? (
        groupBy === 'extension'
          ? getExtension(files[0]?.id)
          : files[0]?.super_category ?? `폴더 ${clusterId}`
      );
      setActiveCluster(name);
      setSelectedClusterFiles(files);

      if (activeTab !== 1) {
        setActiveTab(1); // ✅ 클러스터 누르면 개인탭으로 이동
      }
      if (isCollapsed) {
        setIsCollapsed(false); // ✅ 사이드바 펼치기
      }
    }

    // ✅ 줌은 선택적으로 수행
    if (!shouldZoom) return;

    setTimeout(() => {
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
    }, 100);
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setDimmedNodes([]);
      setIsSearching(false);  // ✅ 검색 종료
    } else {
      setIsSearching(true);
      handleSearch(); // ✅ 즉시 반영
    }
  }, [searchTerm]);

  useEffect(() => {
    // 📋 개인 클러스터 탭
    if (activeTab === 1 && userInfo?.userId && clusterSource !== "private" &&
      clusterSource !== "none") {
      setActiveFolderType("private");
      setActiveSharedCluster(null);
      setSelectedSharedFolderId(null);
      setHoverNode(null);
      fetchClusterData(userInfo.userId);
      setClusterSource("private");
    }

    // 🤝 공유 폴더 탭 → 그래프는 유지하고 아무 작업도 하지 않음
    if (activeTab === 2 && clusterSource === "private") {
      setActiveCluster(null);
      setActiveSharedCluster(null);
      setHoverNode(null);
      // ❌ 공유 클러스터 불러오지 않음
      // ❌ setClusterData([]) 하지 않음!
      // 📌 대신 setClusterSource("none") 같은 중간 상태로 두면 깔끔함
      setClusterSource("none");
    }
  }, [activeTab]);

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
      setClusterSource("private"); // ✅ 추가
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
    fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/me`, {
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

  const confirmOverwrite = (file, folderId) => {
    return new Promise((resolve, reject) => {
      setOverwritePrompt({ file, folderId, resolve, reject });
    });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);

    // 업로드 시작 표시
    setIsUploading(true);
    setUploadProgress(0);

    const uploadTargets = [];

    // 먼저 체크: 어떤 파일을 업로드할지 확정
    for (const file of droppedFiles) {
      const folderId = selectedFolder !== "private" ? selectedFolder : null;
      let checkUrl = `${process.env.REACT_APP_API_BASE_URL}/api/files/check?filename=${encodeURIComponent(file.name)}`;
      if (folderId) checkUrl += `&folderId=${folderId}`;

      try {
        const res = await fetch(checkUrl, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        let overwrite = false;
        if (data.exists) {
          const confirm = await confirmOverwrite(file, folderId);
          if (!confirm) continue; // ❌ 동의 안 하면 스킵
          overwrite = true;
        }

        uploadTargets.push({ file, folderId, overwrite });
      } catch (err) {
        console.error("파일 존재 확인 중 오류:", err);
      }
    }

    const total = uploadTargets.length;
    let completed = 0;

    // 실제 업로드
    for (const { file, folderId, overwrite } of uploadTargets) {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folderId", folderId);
      formData.append("overwrite", overwrite.toString());

      try {
        const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/files/upload?analyze=false`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (res.ok) {
          //toast.success(`📤 ${file.name} 업로드 성공`);
          fetchFiles();
          fetchAllMyFiles();
        } else {
          const errorText = await res.text();
          toast.error("❌ 업로드 실패: " + errorText);
        }
      } catch (err) {
        toast.error("❌ 업로드 중 오류 발생");
      } finally {
        completed++;
        setUploadProgress(Math.round((completed / total) * 100));
        // 업로드 루프 끝나고 마지막에 실행되는 부분 안에 추가
        if (completed === total) {
          setTimeout(() => {
            setIsUploading(false);
            setIsAnalyzing(true);  // 🔥 분석 시작 표시

            if (userInfo?.userId) {
              if (folderId) {
                fetch(`${process.env.REACT_APP_API_BASE_URL}/api/analyze/shared?folderId=${folderId}`, {
                  method: "POST",
                  credentials: "include"
                }).then(() => {
                  fetchFilesInSharedFolder(folderId);
                }).catch(err => console.error("공유 분석 실패:", err))
                  .finally(() => setIsAnalyzing(false)); // 🔥 분석 종료 표시
              } else {
                fetch(`${process.env.REACT_APP_API_BASE_URL}/api/analyze/user`, {
                  method: "POST",
                  credentials: "include"
                }).then(() => {
                  fetchClusterData(userInfo.userId);
                }).catch(err => console.error("개인 분석 실패:", err))
                  .finally(() => setIsAnalyzing(false)); // 🔥 분석 종료 표시
              }
            }
          }, 800);
        }
      }
    }

    // 모든 파일이 취소되었을 경우
    if (uploadTargets.length === 0) {
      setIsUploading(false);
      setUploadProgress(0);
    }
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
                  {overwritePrompt && (
                    <div className="overwrite-popup">
                      <div className="popup-content">
                        <p><strong>{overwritePrompt.file.name}</strong> 파일이 이미 존재합니다. 덮어쓰시겠습니까?</p>
                        <div className="popup-buttons">
                          <button onClick={() => {
                            overwritePrompt.resolve(true);
                            setOverwritePrompt(null);
                          }}>덮어쓰기</button>
                          <button onClick={() => {
                            overwritePrompt.resolve(false);
                            setOverwritePrompt(null);
                          }}>취소</button>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <h3>📋 내 폴더</h3>

                  {/* 🔘 분류 방식 버튼 */}
                  <div className="toggle-button-group">
                    <button
                      className={`toggle-button ${groupBy === 'category' ? 'active' : ''}`}
                      onClick={() => {
                        setGroupBy("category");
                        setActiveCluster(null);
                      }}
                    >
                      카테고리 기준
                    </button>
                    <button
                      className={`toggle-button ${groupBy === 'extension' ? 'active' : ''}`}
                      onClick={() => {
                        setGroupBy("extension");
                        setActiveCluster(null);
                      }}
                    >
                      확장자 기준
                    </button>
                  </div>

                  {/* 🔍 검색 */}
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="파일 이름 검색"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* 📂 분류된 목록 */}
                  <div className="folder-list-scroll custom-scroll">
                    {Object.entries(groupFiles(clusterData.filter(f => f.type === 'file'))).map(
                      ([groupName, files]) => (
                        <div key={groupName} style={{ marginBottom: '20px' }}>
                          <h4
                            style={{ cursor: 'pointer', color: '#f0f0f0', fontWeight: 'bold' }}
                            onClick={() => {
                              const anyFile = files[0];
                              if (anyFile && typeof anyFile.cluster === 'number') {
                                const shouldZoom = groupBy === "category"; // 🔥 조건 추가
                                handleFolderClick(anyFile.cluster, groupName, shouldZoom);
                              }
                            }}
                          >
                            📂 {groupName}
                          </h4>
                          {activeCluster === groupName && (
                            <div className="file-scroll-box custom-scroll">
                              <ul className="file-list">
                                {files.map(file => {
                                  const isSearchMatch = isSearching && searchResults.some(f => f.id === file.id);
                                  return (
                                    <li key={file.id} className={`file-item ${isSearchMatch ? 'search-hit' : ''}`}>
                                      <span title={file.id}>{file.id}</span>
                                      <button className="download-btn" onClick={() => handleDownload(file.id)}>다운로드</button>
                                      <button className="delete-btn" onClick={() => handleDeleteFile(file.id)}>삭제</button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
              {activeTab === 2 && (
                <div className="upload-area shared-tab-layout">
                  <h3>🤝 공유 폴더</h3>

                  {/* 🔍 검색바 + 새폴더 생성 */}
                  <div className="search-bar">
                    <input
                      type="text"
                      placeholder="파일 이름 검색"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="create-shared-folder">
                    <input
                      type="text"
                      placeholder="새 공유 폴더 이름"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                    <button onClick={handleCreateSharedFolder}>생성</button>
                  </div>

                  {/* 🔁 공유폴더 목록 (고정 높이 + 스크롤) */}
                  <div className="shared-folder-scroll-box custom-scroll">
                    <ul className="shared-folder-list">
                      {sharedFolders.map((folder) => (
                        <li key={folder.id} className="shared-folder-item">
                          <span onClick={() => fetchFilesInSharedFolder(folder.id)}>
                            📁 {folder.folderName}
                          </span>
                          <button onClick={() => handleCopyUrl(`${process.env.REACT_APP_FRONT_URL}/shared/${folder.shareUrl}`)}>
                            공유 URL 복사
                          </button>
                          <button className="delete-folder-btn" onClick={() => handleDeleteSharedFolder(folder.id)}>
                            삭제
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 🔁 클러스터 + 파일 리스트 통합 영역 (스크롤) */}
                  {selectedSharedFolderId && (
                    <div className="shared-folder-body-box custom-scroll">
                      <h4>📂 {sharedFolders.find(f => f.id == selectedSharedFolderId)?.folderName}</h4>

                      <div className="toggle-button-group" style={{ margin: '10px 0' }}>
                        <button
                          className={`toggle-button ${sharedGroupBy === 'category' ? 'active' : ''}`}
                          onClick={() => {
                            setSharedGroupBy("category");
                            setActiveSharedCluster(null);
                          }}
                        >
                          카테고리 기준
                        </button>
                        <button
                          className={`toggle-button ${sharedGroupBy === 'extension' ? 'active' : ''}`}
                          onClick={() => {
                            setSharedGroupBy("extension");
                            setActiveSharedCluster(null);
                          }}
                        >
                          확장자 기준
                        </button>
                      </div>

                      {sharedClusterData.length === 0 ? (
                        <p>📭 업로드된 파일이 없습니다.</p>
                      ) : (
                        Object.entries(groupSharedFiles(sharedClusterData)).map(([groupName, files]) => (
                          <div key={groupName}>
                            <h5
                              style={{ cursor: 'pointer', color: '#f0f0f0' }}
                              onClick={() => {
                                setActiveSharedCluster(prev => {
                                  const next = prev === groupName ? null : groupName;
                                  if (next !== null) {
                                    const shouldZoom = sharedGroupBy === "category";
                                    setTimeout(() => handleFolderClick(files[0].cluster, groupName, shouldZoom), 0);
                                  }
                                  return next;
                                });
                              }}
                            >
                              📁 {groupName}
                            </h5>

                            {activeSharedCluster === groupName && (
                              <div className="shared-folder-file-scroll-box custom-scroll">
                                <ul className="file-list">
                                  {files.map(item => {
                                    const isSearchMatch = isSearching && searchResults.some(f => f.filename === item.filename);
                                    return (
                                      <li key={item.filename} className={`file-item ${isSearchMatch ? 'search-hit' : ''}`}>
                                        <span title={item.filename}>{item.filename}</span>
                                        <button className="download-btn" onClick={() => handleDownload(item.filename)}>다운로드</button>
                                        <button className="delete-btn" onClick={() => handleDeleteSharedFile(selectedSharedFolderId, item.filename)}>삭제</button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
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
        {isAnalyzing && (
          <div className="graph-analyzing-banner">
            🧠 그래프 분석 중입니다...
          </div>
        )}
        <div className="top-right-controls">
          <button onClick={fitAllNodesToScreen}>🔄 전체 보기</button>
          {isSearching && (
            <button onClick={() => {
              setSearchTerm("");        // 입력된 검색어 초기화
              setDimmedNodes([]);       // 흐림 해제
              setIsSearching(false);    // 검색 상태 해제
            }}>
              ❌ 검색 해제
            </button>
          )}
        </div>
        <ForceGraph2D
          backgroundColor="#1a1a1a"
          nodeAutoColorBy="cluster"
          enableNodeDrag={false}
          ref={forceGraphRef}
          width={dimensions.width}
          height={dimensions.height}
          minZoom={0.5} // ✅ 최소 줌 0.5배 (너무 축소 방지)
          maxZoom={6}   // ✅ 최대 줌 4배 (너무 확대 방지)
          graphData={{
            nodes: clusterData,
            links: forceGraphRef.current?._custom_links || [],
          }}
          nodeId="id"
          nodeLabel={null}
          cooldownTicks={1} // 바로 안정화
          d3Force={graph => {
            graph.force("charge", forceManyBody().strength(-100));     // 기본 거리
            graph.force("collision", forceCollide().radius(12));       // 충돌 방지
          }}
          linkColor={(link) => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;

            if (sourceId.startsWith('user_') && targetId.startsWith('cluster_')) {
              return 'rgba(153, 153, 153, 0.4)';
            }

            const targetColor = clusterData.find(n => n.id === targetId)?.color || '#ccc';
            return targetColor;
          }}
          linkWidth={1}
          nodeColor={(node) => node.color}
          nodeCanvasObject={(node, ctx) => {
            ctx.save();
            const isCluster = node.type === "cluster";
            const isUser = node.type === "user";
            const isDimmed = dimmedNodes.includes(node.id);
            const isHighlighted = !isDimmed && searchTerm.trim() && node.type === 'file';

            const baseRadius = isUser ? 10 : 4;
            let dynamicRadius = baseRadius;

            let text = "";
            if (isCluster) {
              text = node.super_category || `${node.cluster}`;
              ctx.font = 'bold 12px sans-serif';
              const textWidth = ctx.measureText(text).width;
              dynamicRadius = Math.max(dynamicRadius, textWidth / 2 + 6);
            }

            ctx.globalAlpha = isDimmed ? 0.1 : isCluster ? 0.4 : 1.0;

            if (isUser) {
              ctx.shadowColor = 'white';
              ctx.shadowBlur = 15;
            } else if (isHighlighted) {
              ctx.shadowColor = 'rgba(255, 255, 0, 0.9)';
              ctx.shadowBlur = 25;
            } else {
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(node.x, node.y, dynamicRadius, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();

            if (isCluster) {
              const userColor = clusterData.find(n => n.type === 'user')?.color || "#999999";
              ctx.fillStyle = userColor;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(text, node.x, node.y);
            }

            ctx.restore();
          }}
          nodeCanvasObjectMode={() => "replace"}
          linkCanvasObject={(link, ctx) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            const sourceNode = clusterData.find(n => n.id === sourceId);
            const targetNode = clusterData.find(n => n.id === targetId);

            if (!sourceNode || !targetNode) return;

            const isUserToCluster = sourceId.startsWith('user_') && targetId.startsWith('cluster_');
            const sourceDimmed = dimmedNodes.includes(sourceId);
            const targetDimmed = dimmedNodes.includes(targetId);
            if (sourceDimmed || targetDimmed) return;

            ctx.save();
            ctx.strokeStyle = isUserToCluster ? 'rgba(153, 153, 153, 0.3)' : (targetNode.color || '#ccc');
            ctx.lineWidth = 1.5;
            ctx.setLineDash(isUserToCluster ? [4, 4] : []);

            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            const curveOffset = 8;
            const controlX = midX + (targetNode.y - sourceNode.y) / curveOffset;
            const controlY = midY - (targetNode.x - sourceNode.x) / curveOffset;

            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.quadraticCurveTo(controlX, controlY, targetNode.x, targetNode.y);
            ctx.stroke();
            ctx.restore();
          }}
          onZoom={(zoom) => setTimeout(() => setZoomLevel(zoom), 0)}
          onNodeClick={(node) => {
            if (node.type === "file") {
              // ✨ 편집 페이지로 이동
              const filename = encodeURIComponent(node.id);
              const folderParam = activeFolderType === "shared"
                ? `folderId=${selectedSharedFolderId}`
                : `userId=${userInfo.userId}`;
              navigate(`/preview?${folderParam}&filename=${filename}`);
            } else if (node.type === "cluster") {
              // ✅ 클러스터 폴더 열기 (기존 동작)
              handleFolderClick(node.cluster);
            }
          }}
          onNodeHover={(node) => {
            if (node && node.type === 'file') {
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
        {hoverNode && hoverNode.type === 'file' && (
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
            <strong>{hoverNode.id}</strong>
          </div>
        )}
      </div>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          isLoading={isModalLoading} // ✅ 추가
        />
      )}
      <ToastContainer
        position="top-center"
        autoClose={1000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default Home;