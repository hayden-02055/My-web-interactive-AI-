---
id: sentinel-club
title: Sentinel Club
category: AI Agent / Personal Product
status: in-progress
period: 2026 – Present
order: 2
summary: >
  여러 AI 모델을 사용자가 직접 연결해서 쓸 수 있도록 설계한
  개인용 AI Agent 플랫폼.
tech: [Python, LLM APIs, Multi-Agent Orchestration, Docker, Local/BYOM, Logging & Safety]
retrievable: true
---

## Overview

Sentinel Club은 사용자가 원하는 AI 모델을 직접 연결(BYOM)해서 사용할 수 있는 개인용 AI Agent 플랫폼입니다. Multi-agent orchestration을 중심으로, 여러 Agent가 협업해 작업을 수행하는 구조를 목표로 합니다.

## Problem

상용 AI Agent 서비스 대부분은 특정 모델·벤더에 종속되어 있어, 사용자가 원하는 모델을 자유롭게 선택하기 어렵습니다. 또한 개인이 여러 Agent를 안전하게 운용할 수 있는 로깅·모니터링 체계를 갖춘 도구도 흔치 않습니다.

## My Role

개인 프로젝트로 기획부터 Agent Orchestration 구조 설계, Backend/Infra 구현까지 전 과정을 담당하고 있습니다.

## Constraints

- 개인 프로젝트로 진행 중이라 리소스와 시간이 제한적입니다.
- BYOM 구조상 다양한 LLM Provider의 API 스펙 차이를 흡수해야 합니다.

## Solution

Python 기반으로 Multi-Agent Orchestration 계층을 구축하고, 사용자가 자신의 LLM API 키를 등록해 원하는 모델을 연결(BYOM)할 수 있도록 설계했습니다. Docker로 배포 단위를 분리하고, Logging & Safety 계층을 통해 Agent 동작을 추적합니다.

## Architecture

Python 기반 Agent Orchestration 서비스가 여러 LLM Provider를 BYOM 방식으로 연결하고, Docker 컨테이너 단위로 실행됩니다. Logging & Safety 계층이 모든 Agent 실행을 기록합니다.

## Key Decisions

- 특정 LLM Provider에 종속되지 않도록, 처음부터 BYOM을 핵심 구조로 설계했습니다.
- Agent 동작을 신뢰할 수 있도록 Logging & Safety를 부가 기능이 아닌 핵심 구성 요소로 두었습니다.

## Result

현재 개발이 진행 중이며, 핵심 Orchestration 및 BYOM 연결 구조를 구현하고 있습니다. 구체적인 성과 지표는 프로젝트 완료 후 추가할 예정입니다.

## What I Learned

개인 프로젝트에서도 처음부터 확장 가능한 구조(BYOM)를 잡아두면, 이후 리팩토링 비용이 크게 줄어든다는 것을 체감하고 있습니다.
