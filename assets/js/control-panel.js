const element = (id) => document.getElementById(id);
const uid = new URLSearchParams(location.search).get("uid");
const webuiVersion = "WebUI v1.2.0";
const APP_CONFIG = {
    assets: {
        icons: {
            actionSave: "assets/icons/action-save.svg",
            actionHelp: "assets/icons/action-help.svg",
            actionCopyLink: "assets/icons/action-copy-link.svg",
            actionDiagnose: "assets/icons/action-diagnose.svg",
            statusLoading: "assets/icons/status-loading.svg",
            statusReady: "assets/icons/status-ready.svg",
            statusUpdate: "assets/icons/status-update.svg",
            statusError: "assets/icons/status-error.svg"
        }
    },
    urls: {
        apiBase: "https://api.bluearchive.cafe",
        shareBase: "https://control.bluearchive.cafe"
    },
    fetch: {
        timeout: 10000,
        retries: 2,
        retryDelayMs: 800
    }
};
const API_ENDPOINTS = {
    statusList: `${APP_CONFIG.urls.apiBase}/status/list`,
    configGet: `${APP_CONFIG.urls.apiBase}/config/get`,
    configSet: `${APP_CONFIG.urls.apiBase}/config/set`
};

/*  让 MDUI 组件跟随系统深浅色 */
mdui.setTheme("auto");

/*  设置页面主题色  */
mdui.setColorScheme("#1976D2");

const statusStyles = {
    loading:  { text: "加载中",   css: "status-icon-loading" },
    ready:    { text: "可用",     css: "status-icon-ready" },
    waiting:  { text: "待维护",   css: "status-icon-waiting" },
    failed:   { text: "获取失败", css: "status-icon-failed" }
};
const resourceVersions = {
    text: null,
    voice: null,
    media: null
};
const hasUid = typeof uid === "string" && uid.trim() !== "";

/* ——————————————————————————————
 * 网络层：超时 + 重试
 * —————————————————————————————— */

const fetchWithTimeout = (url, options = {}, timeout = APP_CONFIG.fetch.timeout) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
};

const fetchWithRetry = async (url, options = {}, {
    timeout = APP_CONFIG.fetch.timeout,
    retries = APP_CONFIG.fetch.retries,
    retryDelayMs = APP_CONFIG.fetch.retryDelayMs
} = {}) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fetchWithTimeout(url, options, timeout);
        } catch (err) {
            lastError = err;
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, retryDelayMs * (attempt + 1)));
            }
        }
    }
    throw lastError;
};

/* ——————————————————————————————
 * 错误日志
 * —————————————————————————————— */

const errorLogs = {};

const storeError = (id, { status, statusText, endpoint, body }) => {
    errorLogs[id] = {
        status,
        statusText: statusText || "未知",
        body: body || "无",
        endpoint,
        timestamp: new Date().toLocaleString("zh-CN")
    };
};

/* ——————————————————————————————
 * UI 交互状态控制
 * —————————————————————————————— */

const INTERACTIVE_IDS = [
    "text-checkbox", "voice-checkbox", "media-checkbox",
    "save-button", "copy-button", "read-button", "diagnose-button"
];

const toggleInteractiveState = (disabled) => {
    INTERACTIVE_IDS.forEach((id) => {
        const el = element(id);
        if (el) el.disabled = disabled;
    });
};

/* ——————————————————————————————
 * 状态展示（CSS class 驱动图标）
 * —————————————————————————————— */

const setStatus = (id, state) => {
    const chip = element(id);
    if (!chip) return;

    const style = statusStyles[state];
    chip.querySelector(".status-label").textContent = style.text;

    const icon = chip.querySelector(".ui-icon");
    if (icon) {
        icon.className = `ui-icon ${style.css}`;
    }

    // 失败状态使用 M3 error 色
    chip.classList.toggle("status-error", state === "failed");

    // 通知读屏软件状态变化
    const announcer = element("status-announcer");
    if (announcer) {
        const featureName = chip.closest(".feature-item")?.querySelector("strong")?.textContent || id;
        announcer.textContent = `${featureName}: ${style.text}`;
    }
};

/* ——————————————————————————————
 * Dialog 弹窗
 * —————————————————————————————— */

const showTextDialog = ({
    headline,
    lines,
    actions = [],
    closeOnOverlayClick = true,
    closeOnEsc = true
}) => {
    const dialog = document.createElement("mdui-dialog");
    dialog.setAttribute("aria-modal", "true");

    if (closeOnOverlayClick) {
        dialog.setAttribute("close-on-overlay-click", "");
    }

    if (closeOnEsc) {
        dialog.setAttribute("close-on-esc", "");
    }

    const headlineElement = document.createElement("div");
    headlineElement.slot = "headline";
    headlineElement.textContent = headline;

    const descriptionElement = document.createElement("div");
    descriptionElement.slot = "description";
    descriptionElement.style.whiteSpace = "pre-line";
    descriptionElement.textContent = lines.join("\n");

    dialog.append(headlineElement, descriptionElement);

    actions.forEach(({ text, variant = "text", onClick, closeOnClick = false }) => {
        const actionElement = document.createElement("mdui-button");
        actionElement.slot = "action";
        actionElement.variant = variant;
        actionElement.textContent = text;
        actionElement.addEventListener("click", async () => {
            if (typeof onClick === "function") {
                await onClick(dialog);
            }

            if (closeOnClick) {
                dialog.open = false;
            }
        });
        dialog.append(actionElement);
    });

    dialog.addEventListener("closed", () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.open = true;
};

/* ——————————————————————————————
 * 剪贴板
 * —————————————————————————————— */

const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.focus();
    textArea.select();

    let copied = false;
    try {
        copied = document.execCommand("copy");
    } finally {
        textArea.remove();
    }

    return copied;
};

const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return fallbackCopyText(text);
        }
    }

    return fallbackCopyText(text);
};

/* ——————————————————————————————
 * 查看说明
 * —————————————————————————————— */

const showHelp = () => {
    showTextDialog({
        headline: "操作说明",
        lines: [
            "1. 先确认各项状态，再决定是否开启对应功能",
            "2. 只有状态为“可用”时，功能才能正常生效",
            "3. 主线中配仅对主线剧情内容生效",
            "4. 开启“图像视频”后，可能需要重新下载相关资源"
        ],
        actions: [
            {
                text: "知道了",
                variant: "tonal",
                closeOnClick: true
            }
        ]
    });
};

/* ——————————————————————————————
 * 诊断信息
 * —————————————————————————————— */

const getBrowserEngineVersion = () => {
    const { userAgent } = navigator;
    const edge = userAgent.match(/Edg\/([\d.]+)/);
    if (edge) return `Chromium ${edge[1]} (Edge)`;

    const chrome = userAgent.match(/Chrome\/([\d.]+)/);
    if (chrome) return `Chromium ${chrome[1]}`;

    const firefox = userAgent.match(/Firefox\/([\d.]+)/);
    if (firefox) return `Gecko ${firefox[1]} (Firefox)`;

    const safari = userAgent.match(/Version\/([\d.]+).*Safari/);
    if (safari) return `WebKit ${safari[1]} (Safari)`;

    return "无法识别";
};

const formatVersionLine = (label, versionInfo) => {
    if (!versionInfo) return `${label}: 暂无数据`;
    return `${label}:\n * 官方: ${versionInfo.official}\n * 汉化: ${versionInfo.localized}`;
};

const getDiagnosticsLines = () => {
    const { userAgent, appVersion, platform, language, languages, onLine, cookieEnabled, hardwareConcurrency, deviceMemory } = navigator;
    const viewport = `${window.innerWidth} x ${window.innerHeight}`;
    const screenSize = `${window.screen.width} x ${window.screen.height}`;

    return [
        `浏览器内核: ${getBrowserEngineVersion()}`,
        `User-Agent: ${userAgent}`,
        `App Version: ${appVersion}`,
        `平台: ${platform || "未知"}`,
        `语言: ${language || "未知"}`,
        `语言列表: ${Array.isArray(languages) && languages.length ? languages.join(", ") : "未知"}`,
        `在线状态: ${onLine ? "在线" : "离线"}`,
        `Cookie: ${cookieEnabled ? "已启用" : "已禁用"}`,
        `视口尺寸: ${viewport}`,
        `屏幕尺寸: ${screenSize}`,
        `设备像素比: ${window.devicePixelRatio || 1}`,
        `控制面板 UID: ${hasUid ? uid : "未提供"}`,
        `当前地址: ${location.href}`,
        formatVersionLine("文本资源版本", resourceVersions.text),
        formatVersionLine("语音资源版本", resourceVersions.voice),
        formatVersionLine("媒体资源版本", resourceVersions.media)
    ];
};

/* ——————————————————————————————
 * 错误详情弹窗
 * —————————————————————————————— */

const RESOURCE_ERROR_NAMES = {
    "text-status": "游戏文本",
    "voice-status": "主线中配",
    "media-status": "图像视频",
    "config-get": "用户配置"
};

const showErrorLog = (chipId) => {
    const chip = element(chipId);
    if (!chip || !chip.classList.contains("status-error")) return;

    const log = errorLogs[chipId];
    const name = RESOURCE_ERROR_NAMES[chipId] || chipId;

    if (!log) {
        showTextDialog({
            headline: `「${name}」错误详情`,
            lines: ["暂无详细错误信息"],
            actions: [{ text: "关闭", variant: "tonal", closeOnClick: true }]
        });
        return;
    }

    const detailLines = [
        `接口: ${log.endpoint}`,
        `状态码: ${log.status}`,
        `错误信息: ${log.statusText}`,
        `时间: ${log.timestamp}`,
        `响应内容: ${log.body}`
    ];

    showTextDialog({
        headline: `「${name}」获取失败`,
        lines: detailLines,
        actions: [
            {
                text: "复制详情",
                variant: "tonal",
                onClick: async () => {
                    const copied = await copyText(detailLines.join("\n"));
                    mdui.snackbar({
                        message: copied ? "已复制到剪贴板" : "复制失败",
                        closeable: true
                    });
                }
            },
            {
                text: "关闭",
                variant: "text",
                closeOnClick: true
            }
        ]
    });
};

/* ——————————————————————————————
 * 保存设置（防抖 + POST + 重试）
 * —————————————————————————————— */

let savePending = false;

element("save-button").addEventListener("click", async () => {
    if (savePending) return;

    if (!hasUid) {
        showTextDialog({
            headline: "无法保存",
            lines: [
                "当前链接缺少有效的 UID 参数",
                "无法确认要保存到哪个账号",
                "请从游戏内公告 → 活动 → 控制面板进入，通过完整链接重新打开页面"
            ],
            closeOnOverlayClick: false,
            closeOnEsc: false,
            actions: [
                {
                    text: "关闭",
                    variant: "tonal",
                    closeOnClick: true
                }
            ]
        });
        return;
    }

    savePending = true;
    const saveBtn = element("save-button");
    saveBtn.loading = true;
    toggleInteractiveState(true);

    try {
        const text = element("text-checkbox").checked ? "cn" : "jp";
        const voice = element("voice-checkbox").checked ? "cn" : "jp";
        const media = element("media-checkbox").checked ? "cn" : "jp";
        const params = new URLSearchParams({ uid, text, voice, media });
        const endpoint = `${API_ENDPOINTS.configSet}?${params}`;

        const response = await fetchWithRetry(endpoint);

        if (response.ok) {
            mdui.snackbar({
                message: "设置已保存，重启游戏后生效",
                closeable: true
            });
        } else {
            const responseBody = await response.text().catch(() => "无法读取响应体");
            const errorLines = [
                `接口: ${endpoint}`,
                `状态码: ${response.status}`,
                `错误信息: ${response.statusText}`,
                `时间: ${new Date().toLocaleString("zh-CN")}`,
                `响应内容: ${responseBody}`
            ];
            showTextDialog({
                headline: "保存失败",
                lines: errorLines,
                actions: [
                    {
                        text: "复制详情",
                        variant: "tonal",
                        onClick: async () => {
                            const copied = await copyText(errorLines.join("\n"));
                            mdui.snackbar({
                                message: copied ? "已复制到剪贴板" : "复制失败",
                                closeable: true
                            });
                        }
                    },
                    {
                        text: "关闭",
                        variant: "text",
                        closeOnClick: true
                    }
                ]
            });
        }
    } catch (err) {
        const errorLines = [
            `接口: ${API_ENDPOINTS.configSet}`,
            `状态码: N/A`,
            `错误信息: ${err.name === "AbortError" ? "请求超时" : "请求异常"}`,
            `时间: ${new Date().toLocaleString("zh-CN")}`,
            `错误内容: ${err instanceof Error ? err.message : "未知错误"}`
        ];
        showTextDialog({
            headline: "保存失败",
            lines: errorLines,
            actions: [
                {
                    text: "复制详情",
                    variant: "tonal",
                    onClick: async () => {
                        const copied = await copyText(errorLines.join("\n"));
                        mdui.snackbar({
                            message: copied ? "已复制到剪贴板" : "复制失败",
                            closeable: true
                        });
                    }
                },
                {
                    text: "关闭",
                    variant: "text",
                    closeOnClick: true
                }
            ]
        });
    } finally {
        saveBtn.loading = false;
        toggleInteractiveState(false);
        savePending = false;
    }
});

/* ——————————————————————————————
 * 复制链接
 * —————————————————————————————— */

element("copy-button").addEventListener("click", async () => {
    if (!hasUid) {
        showTextDialog({
            headline: "缺少参数",
            lines: [
                "当前链接缺少有效的 UID 参数",
                "暂时无法生成分享链接",
                "请从游戏内公告 → 活动 → 控制面板进入，通过完整链接重新打开页面"
            ],
            closeOnOverlayClick: false,
            closeOnEsc: false,
            actions: [
                {
                    text: "关闭",
                    variant: "tonal",
                    closeOnClick: true
                }
            ]
        });
        return;
    }

    const shareUrl = `${APP_CONFIG.urls.shareBase}?uid=${uid}`;
    const copied = await copyText(shareUrl);

    showTextDialog({
        headline: copied ? "复制成功" : "复制失败",
        lines: copied
            ? [
                `UID: ${uid}`,
                "控制面板链接已复制到剪贴板",
                "可粘贴到浏览器中打开",
                "请妥善保管，避免被他人修改设置"
            ]
            : [
                "当前浏览器无法自动写入剪贴板",
                "请手动复制下面的链接并在浏览器中打开",
                shareUrl
            ],
        actions: [
            {
                text: "关闭",
                variant: "tonal",
                closeOnClick: true
            }
        ]
    });
});

/* ——————————————————————————————
 * 诊断信息
 * —————————————————————————————— */

element("diagnose-button").addEventListener("click", () => {
    const diagnosticsLines = getDiagnosticsLines();
    showTextDialog({
        headline: "诊断信息",
        lines: diagnosticsLines,
        actions: [
            {
                text: "复制",
                variant: "tonal",
                onClick: async () => {
                    const copied = await copyText(diagnosticsLines.join("\n"));
                    mdui.snackbar({
                        message: copied ? "诊断信息已复制到剪贴板" : "复制失败，请手动复制诊断信息",
                        closeable: true
                    });
                }
            },
            {
                text: "关闭",
                variant: "tonal",
                closeOnClick: true
            }
        ]
    });
});

/* ——————————————————————————————
 * 查看说明 & 状态 chip 点击
 * —————————————————————————————— */

element("read-button").addEventListener("click", showHelp);
element("webui-version").textContent = webuiVersion;

["text-status", "voice-status", "media-status"].forEach((id) => {
    const chip = element(id);
    if (chip) {
        chip.setAttribute("role", "status");
        chip.addEventListener("click", () => showErrorLog(id));
    }
});

/* ——————————————————————————————
 * 初始化
 * —————————————————————————————— */

const init = async () => {
    if (!hasUid) {
        toggleInteractiveState(true);
        setStatus("text-status", "failed");
        setStatus("voice-status", "failed");
        setStatus("media-status", "failed");
        showTextDialog({
            headline: "链接无效",
            lines: [
                "当前页面缺少必要的 UID 参数",
                "暂时无法读取或保存资源开关配置",
                "请从游戏内公告 → 活动 → 控制面板进入，通过完整链接重新打开页面"
            ],
            closeOnOverlayClick: false,
            closeOnEsc: false,
            actions: [
                {
                    text: "知道了",
                    variant: "tonal",
                    closeOnClick: true
                }
            ]
        });
        return;
    }

    try {
        const [statusRes, configRes] = await Promise.all([
            fetchWithRetry(API_ENDPOINTS.statusList),
            fetchWithRetry(`${API_ENDPOINTS.configGet}?uid=${uid}`)
        ]);

        /* —— 处理 status 接口 —— */
        if (statusRes.ok) {
            const status = await statusRes.json();
            resourceVersions.text = {
                official: status.text.official.version,
                localized: status.text.localized.version
            };
            resourceVersions.voice = {
                official: status.voice.official.version,
                localized: status.voice.localized.version
            };
            resourceVersions.media = {
                official: status.media.official.version,
                localized: status.media.localized.version
            };
            const textSynced = status.text.official.version === status.text.localized.version;
            const voiceSynced = status.voice.official.version === status.voice.localized.version;
            const mediaSynced = status.media.official.version === status.media.localized.version;
            setStatus("text-status", textSynced ? "ready" : "waiting");
            setStatus("voice-status", voiceSynced ? "ready" : "waiting");
            setStatus("media-status", mediaSynced ? "ready" : "waiting");
        } else {
            const errorBody = await statusRes.text().catch(() => "无法读取响应体");
            const errorInfo = {
                status: statusRes.status,
                statusText: statusRes.statusText,
                endpoint: API_ENDPOINTS.statusList,
                body: errorBody
            };
            storeError("text-status", errorInfo);
            storeError("voice-status", errorInfo);
            storeError("media-status", errorInfo);
            setStatus("text-status", "failed");
            setStatus("voice-status", "failed");
            setStatus("media-status", "failed");
        }

        /* —— 处理 config 接口 —— */
        if (configRes.ok) {
            const { text, voice, media } = await configRes.json();
            element("text-checkbox").checked = text === "cn";
            element("voice-checkbox").checked = voice === "cn";
            element("media-checkbox").checked = media === "cn";
        } else {
            const errorBody = await configRes.text().catch(() => "无法读取响应体");
            const statusCode = configRes.status;
            storeError("config-get", {
                status: statusCode,
                statusText: configRes.statusText,
                endpoint: `${API_ENDPOINTS.configGet}?uid=${uid}`,
                body: errorBody
            });

            toggleInteractiveState(true);
            setStatus("text-status", "failed");
            setStatus("voice-status", "failed");
            setStatus("media-status", "failed");

            const isInvalidUid = statusCode === 400 || statusCode === 404;
            showTextDialog({
                headline: "无法读取配置",
                lines: isInvalidUid
                    ? [
                        "当前 UID 无效或账号不存在",
                        "暂时无法读取或保存资源开关配置",
                        "请从游戏内公告 → 异常通知 → UID 获取正确的 UID"
                    ]
                    : [
                        "用户配置读取失败，当前开关状态未知",
                        "暂时无法确认您的资源开关设置",
                        "请检查网络连接后刷新页面重试",
                        "如问题持续，请使用诊断信息排查"
                    ],
                closeOnOverlayClick: false,
                closeOnEsc: false,
                actions: [
                    {
                        text: "知道了",
                        variant: "tonal",
                        closeOnClick: true
                    }
                ]
            });
        }

    } catch (err) {
        // 整体异常（如网络完全不可达）
        const errorInfo = {
            status: "N/A",
            statusText: err.name === "AbortError" ? "请求超时" : "请求异常",
            endpoint: API_ENDPOINTS.statusList,
            body: err instanceof Error ? err.message : "未知错误"
        };
        storeError("text-status", errorInfo);
        storeError("voice-status", errorInfo);
        storeError("media-status", errorInfo);
        storeError("config-get", { ...errorInfo, endpoint: `${API_ENDPOINTS.configGet}?uid=${uid}` });
        setStatus("text-status", "failed");
        setStatus("voice-status", "failed");
        setStatus("media-status", "failed");
        mdui.snackbar({
            message: "网络异常，无法读取数据。请检查连接后刷新页面",
            closeable: true,
            timeout: 6000
        });
    }
};

init();
