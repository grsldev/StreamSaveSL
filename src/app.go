package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx     context.Context
	baseDir string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    cfg := a.LoadConfig()
    if cfg.Language == "" {
        cfg.Language = a.GetSystemLanguage()
        a.SaveConfig(cfg)
    }
}

// === Config ===

type Config struct {
	AudioOnly    bool   `json:"audio_only"`
	VideoFormat  string `json:"video_format"`
	AudioFormat  string `json:"audio_format"`
        NoPlaylist bool `json:"no_playlist"`
	DarkTheme    bool   `json:"dark_theme"`
	OutputDir    string `json:"output_dir"`
	Language     string `json:"language"`
	SaveHistory  bool   `json:"save_history"`
	Quality      string `json:"quality"`
}

func defaultConfig() Config {
	home, _ := os.UserHomeDir()
	return Config{
		AudioOnly:   false,
		VideoFormat: "mp4",
		AudioFormat: "mp3",
                NoPlaylist: true,
		DarkTheme:   true,
		OutputDir:   filepath.Join(home, "Downloads"),
		Language:    "",
		SaveHistory: false,
		Quality:     "best",
	}
}

func (a *App) configPath() string {
	return filepath.Join(a.baseDir, "config", "config.json")
}

func (a *App) historyPath() string {
	return filepath.Join(a.baseDir, "config", "history.json")
}

func (a *App) LoadConfig() Config {
	data, err := os.ReadFile(a.configPath())
	if err != nil {
		return defaultConfig()
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return defaultConfig()
	}
	return cfg
}

func (a *App) SaveConfig(cfg Config) error {
	os.MkdirAll(filepath.Join(a.baseDir, "config"), 0755)
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.configPath(), data, 0644)
}

// === History ===

type HistoryEntry struct {
	Title     string `json:"title"`
	URL       string `json:"url"`
	Format    string `json:"format"`
	Date      string `json:"date"`
	AudioOnly bool   `json:"audio_only"`
        Duration  string `json:"duration"`
}

func (a *App) LoadHistory() []HistoryEntry {
	data, err := os.ReadFile(a.historyPath())
	if err != nil {
		return []HistoryEntry{}
	}
	var entries []HistoryEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return []HistoryEntry{}
	}
	return entries
}

func (a *App) saveHistory(entry HistoryEntry) {
	cfg := a.LoadConfig()
	if !cfg.SaveHistory {
		return
	}
	entries := a.LoadHistory()
	entries = append([]HistoryEntry{entry}, entries...)
	if len(entries) > 100 {
		entries = entries[:100]
	}
	data, _ := json.MarshalIndent(entries, "", "  ")
	os.WriteFile(a.historyPath(), data, 0644)
}

func (a *App) ClearHistory() error {
	return os.WriteFile(a.historyPath(), []byte("[]"), 0644)
}

// === Output dir dialog ===

func (a *App) ChooseOutputDir(current string) string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		DefaultDirectory: current,
		Title:            "Choose output folder",
	})
	if err != nil || dir == "" {
		return current
	}
	return dir
}

// === Download ===

var cancelChan chan struct{}

type DownloadRequest struct {
	URL       string `json:"url"`
	AudioOnly bool   `json:"audio_only"`
        NoPlaylist bool `json:"no_playlist"`
	Format    string `json:"format"`
	Quality   string `json:"quality"`
	OutputDir string `json:"output_dir"`
}

func (a *App) StartDownload(req DownloadRequest) {
	cancelChan = make(chan struct{})
	ytdlp := filepath.Join(a.baseDir, "bin", "yt-dlp.exe")
	ffmpeg := filepath.Join(a.baseDir, "bin")
	outputTpl := filepath.Join(req.OutputDir, "%(title)s.%(ext)s")
	if _, err := os.Stat(ytdlp); err != nil {
		runtime.EventsEmit(a.ctx, "download:error", "yt-dlp not found in bin/")
		return
	}
	ffmpegExe := filepath.Join(a.baseDir, "bin", "ffmpeg.exe")
	if _, err := os.Stat(ffmpegExe); err != nil {
		runtime.EventsEmit(a.ctx, "download:error", "ffmpeg not found in bin/")
		return
	}
	var args []string
	if req.AudioOnly {
		args = []string{
			"--ffmpeg-location", ffmpeg,
			"--newline",
			"-x",
			"--audio-format", strings.ToLower(req.Format),
			"-o", outputTpl,
		}
		f := strings.ToLower(req.Format)
		if f == "mp3" || f == "m4a" || f == "aac" || f == "flac" {
			args = append(args, "--embed-thumbnail", "--add-metadata")
		}
	} else {
		qualityArg := "bestvideo+bestaudio/best"
		if req.Quality != "best" {
			qualityArg = fmt.Sprintf("bestvideo[height<=%s]+bestaudio/best", req.Quality)
		}
		args = []string{
			"--ffmpeg-location", ffmpeg,
			"--newline",
			"-f", qualityArg,
			"--merge-output-format", strings.ToLower(req.Format),
			"-o", outputTpl,
		}
		f := strings.ToLower(req.Format)
		if f == "mp4" || f == "mkv" {
			args = append(args, "--embed-thumbnail", "--add-metadata")
		}
	}
	if req.NoPlaylist {
		args = append(args, "--no-playlist")
	}
	args = append(args, req.URL)
	cmd := exec.Command(ytdlp, args...)
	cmd.SysProcAttr = getSysProcAttr()
	stdout, err := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout
	if err != nil {
		runtime.EventsEmit(a.ctx, "download:error", err.Error())
		return
	}
	if err := cmd.Start(); err != nil {
		runtime.EventsEmit(a.ctx, "download:error", err.Error())
		return
	}
	runtime.EventsEmit(a.ctx, "download:started")
	progRe := regexp.MustCompile(`\[download\]\s+(\d{1,3}\.?\d*)%`)
	titleRe := regexp.MustCompile(`\[Merger\] Merging formats into "(.+)"$|^\[download\] Destination: .+[\\/](.+)\.[^.]+$`)
	title := ""
	lastFile := ""
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		select {
		case <-cancelChan:
			killCmd := exec.Command("taskkill", "/F", "/T", "/PID", fmt.Sprintf("%d", cmd.Process.Pid))
			killCmd.SysProcAttr = getSysProcAttr()
			killCmd.Run()
			runtime.EventsEmit(a.ctx, "download:cancelled")
			return
		default:
		}
		line := scanner.Text()
		if m := titleRe.FindStringSubmatch(line); m != nil {
			if m[1] != "" {
				title = strings.TrimSuffix(filepath.Base(m[1]), filepath.Ext(m[1]))
				lastFile = m[1]
			} else {
				title = m[2]
				lastFile = filepath.Join(req.OutputDir, m[2]+"."+strings.ToLower(req.Format))
			}
		}
		if strings.Contains(line, "[download] Downloading video") {
			runtime.EventsEmit(a.ctx, "download:status", "video")
		} else if strings.Contains(line, "[download] Downloading audio") {
			runtime.EventsEmit(a.ctx, "download:status", "audio")
		} else if strings.Contains(line, "[Merger]") {
			runtime.EventsEmit(a.ctx, "download:status", "merging")
		} else if strings.Contains(line, "[ExtractAudio]") {
    			runtime.EventsEmit(a.ctx, "download:status", "converting")
		}
		if m := progRe.FindStringSubmatch(line); m != nil {
			pct, _ := strconv.ParseFloat(m[1], 64)
			runtime.EventsEmit(a.ctx, "download:progress", pct)
		}
	}
	err = cmd.Wait()
	select {
	case <-cancelChan:
		runtime.EventsEmit(a.ctx, "download:cancelled")
		return
	default:
	}
	if err != nil {
		runtime.EventsEmit(a.ctx, "download:error", err.Error())
		return
	}
	duration := a.getMediaDuration(lastFile)
	a.saveHistory(HistoryEntry{
		Title:     title,
		URL:       req.URL,
		Format:    req.Format,
		Date:      time.Now().Format("2006-01-02 15:04"),
		AudioOnly: req.AudioOnly,
		Duration:  duration,
	})
	runtime.EventsEmit(a.ctx, "download:done", map[string]string{"dir": req.OutputDir, "title": title})
}

func (a *App) CancelDownload() {
	if cancelChan != nil {
		select {
		case <-cancelChan:
		default:
			close(cancelChan)
		}
	}
}

// === Validação ===

func (a *App) GetAvailableQualities(url string) []string {
	ytdlp := filepath.Join(a.baseDir, "bin", "yt-dlp.exe")
	cmd := exec.Command(ytdlp, "-F", "--no-playlist", url)
        cmd.SysProcAttr = getSysProcAttr()
        out, err := cmd.Output()
	if err != nil {
		return []string{"best", "1080", "720", "480", "360"}
	}

	seen := map[string]bool{}
	qualities := []string{"best"}
	re := regexp.MustCompile(`(\d{3,4})p`)

	for _, line := range strings.Split(string(out), "\n") {
		if m := re.FindStringSubmatch(line); m != nil {
			if !seen[m[1]] {
				seen[m[1]] = true
				qualities = append(qualities, m[1])
			}
		}
	}
	return qualities
}

func (a *App) GetSystemLanguage() string {
    cmd := exec.Command("reg", "query", 
        `HKEY_CURRENT_USER\Control Panel\International`,
        "/v", "LocaleName")
    cmd.SysProcAttr = getSysProcAttr()
    out, err := cmd.Output()
    if err != nil {
        return "en"
    }
    result := strings.ToLower(string(out))
    if strings.Contains(result, "pt-") {
        return "pt"
    }
    return "en"
}

func (a *App) getMediaDuration(filePath string) string {
    ffprobe := filepath.Join(a.baseDir, "bin", "ffprobe.exe")
    if _, err := os.Stat(ffprobe); err != nil {
        return ""
    }
    cmd := exec.Command(ffprobe,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        filePath,
    )
    cmd.SysProcAttr = getSysProcAttr()
    out, err := cmd.Output()
    if err != nil {
        return ""
    }
    secs, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
    if err != nil {
        return ""
    }
    m := int(secs) / 60
    s := int(secs) % 60
    return fmt.Sprintf("%d:%02d", m, s)
}
