package main

import (
	"os/exec"
	"syscall"
)

func getSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{HideWindow: true}
}

func init() {
	_ = exec.Command("")
}