---
id: perix-sentinel
title: Perix Sentinel
category: AI System / Automation
status: in-progress
period: 2026 – Present
order: 3
summary: >
  뉴스를 자동 수집·분석·스코어링해서 필요한 정보만
  전달하는 AI 자동화 시스템.
tech: [Python, FastAPI, LLM API, News/Data Pipeline, Discord API, Scoring System]
retrievable: true
---

## Overview

Perix Sentinel은 뉴스를 자동으로 수집·분석·스코어링해서, 사용자에게 필요한 정보만 선별해 전달하는 AI 자동화 시스템입니다.

## Problem

매일 쏟아지는 뉴스 중 실제로 의미 있는 정보를 사람이 직접 걸러내는 데는 많은 시간이 듭니다. 관심 주제와 관련된 뉴스만 자동으로 스코어링해서 전달하는 파이프라인이 필요했습니다.

## My Role

기획부터 데이터 수집 파이프라인, Scoring 로직, Discord를 통한 자동 리포팅까지 전 과정을 개인적으로 설계하고 구현하고 있습니다.

## Constraints

- 뉴스 소스마다 형식이 달라, 수집 단계에서 데이터 정규화가 필요합니다.
- 스코어링 기준이 주관적일 수 있어, 반복적으로 검증하며 개선해야 합니다.

## Solution

FastAPI 기반 Backend에서 News/Data Pipeline이 뉴스를 수집하고, LLM API를 활용해 관련성과 중요도를 Scoring합니다. 선별된 결과는 Discord API를 통해 자동으로 리포팅됩니다.

## Architecture

FastAPI Backend가 News/Data Pipeline → Scoring System → Discord 리포팅으로 이어지는 파이프라인을 오케스트레이션합니다.

## Key Decisions

- 사람이 매번 확인하지 않아도 되도록, 전달 채널을 Discord로 정하고 리포팅을 완전히 자동화하는 것을 목표로 삼았습니다.
- Scoring 로직을 LLM API에 위임해, 규칙 기반 필터링보다 유연한 관련성 판단이 가능하도록 설계했습니다.

## Result

현재 개발이 진행 중이며, 수집·스코어링·리포팅 파이프라인의 핵심 구조를 구현하고 있습니다. 구체적인 성과 지표는 프로젝트 완료 후 추가할 예정입니다.

## What I Learned

자동화 파이프라인에서는 수집 단계의 데이터 품질이 이후 모든 단계의 정확도를 좌우한다는 것을 체감하고 있습니다.
