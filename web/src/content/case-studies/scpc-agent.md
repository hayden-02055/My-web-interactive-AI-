---
id: scpc-agent
title: SCPC Agent Project
category: AI Agent / Competition
status: in-progress
period: 2026 – Present
order: 4
summary: >
  삼성 SCPC AI 대회를 위해 만든 메모리·계획·안전성을
  포함한 Agent Harness.
tech: [Python, LLM/SLM, Agent Harness, Memory, Planning, Safety, Structured JSON]
retrievable: true
---

## Overview

SCPC Agent Project는 삼성 SCPC AI 대회를 위해 만든 Agent Harness입니다. Memory, Planning, Safety를 포함한 구조로 Device Agent를 구현하는 것을 목표로 합니다.

## Problem

대회 환경에서는 Agent가 제한된 리소스와 평가 환경 안에서 안정적으로 계획을 세우고 실행해야 합니다. 단순 프롬프트 체이닝만으로는 Memory 유지나 Safety 보장이 어렵습니다.

## My Role

팀의 일원으로 Agent Harness 설계, Memory/Planning 모듈 구현, Structured JSON 기반 출력 형식 정의를 담당하고 있습니다.

## Constraints

- 대회 규정에 맞는 평가 환경(Evaluation environment) 안에서 동작해야 합니다.
- LLM/SLM의 출력이 Structured JSON 형식을 안정적으로 지켜야 후속 로직이 정상 동작합니다.

## Solution

Python 기반 Agent Harness에 Memory와 Planning 모듈을 구성하고, 모든 Agent 출력이 Structured JSON 스키마를 따르도록 설계했습니다. Safety 계층을 두어 Agent가 허용된 행동 범위를 벗어나지 않도록 제어합니다.

## Architecture

Python Agent Harness가 Memory, Planning, Safety 세 모듈을 오케스트레이션하며, LLM/SLM과의 모든 상호작용은 Structured JSON을 통해 이루어집니다.

## Key Decisions

- Agent의 판단 근거를 추적할 수 있도록, 자유 형식 텍스트 대신 Structured JSON 출력을 표준으로 채택했습니다.
- Safety를 사후 필터링이 아니라 Harness 구조 자체에 포함시켰습니다.

## Result

현재 대회를 목표로 개발이 진행 중이며, Agent Harness의 핵심 모듈(Memory, Planning, Safety)을 구현하고 있습니다. 구체적인 평가 결과는 대회 진행 후 추가할 예정입니다.

## What I Learned

제한된 평가 환경에서는 Agent의 자유도보다 예측 가능성(Structured Output)이 더 중요한 설계 기준이 될 수 있다는 것을 배우고 있습니다.
