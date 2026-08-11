---
id: fingoo
title: Fingoo
category: Backend / Production Experience
status: shipped
period: 2024 – 2026
order: 1
summary: >
  금융 교육 서비스의 백엔드 아키텍처 설계와
  LangGraph 멀티에이전트 시스템 정리·인수인계.
tech: [NestJS, TypeScript, PostgreSQL, Redis]
retrievable: true
---

## Overview

Fingoo는 투자 분석에서 금융 교육으로 피벗한 금융 서비스입니다. Backend / AI 개발자로 합류해 백엔드 아키텍처 설계와, 피벗 이전에 구축되어 있던 LangGraph 기반 멀티에이전트 시스템의 정리 및 인수인계를 담당했습니다.

## Problem

LangGraph 기반 멀티에이전트 시스템이 제품 방향 전환(투자 분석 → 금융 교육) 이후 새로운 제품 방향과 맞지 않게 되었고, 문서화도 충분하지 않아 팀이 구조를 온전히 파악하기 어려운 상태였습니다.

## My Role

CTO 겸 AI/Backend 개발자로서 백엔드 아키텍처 설계, API 개발, 그리고 기존 멀티에이전트 시스템의 구조 정리와 인수인계 문서 작성을 주도했습니다.

## Constraints

- 제품 방향이 이미 한 차례 전환된 상태에서 합류해, 기존 코드베이스와 새로운 방향성 사이의 간극을 고려해야 했습니다.
- 실제 운영 중인 서비스였기 때문에, 재작업은 팀 협업과 인수인계를 전제로 진행해야 했습니다.

## Solution

NestJS 기반 백엔드 아키텍처를 설계하고, PostgreSQL과 Redis를 활용한 데이터·캐시 계층을 구성했습니다. 동시에 기존 LangGraph 멀티에이전트 시스템의 구조를 정리해, 팀이 이해하고 유지보수할 수 있는 형태로 문서화했습니다.

## Architecture

NestJS(TypeScript) 백엔드, PostgreSQL을 주 데이터 저장소로, Redis를 캐시·세션 계층으로 사용하는 구조입니다. API 설계 시 팀의 협업 흐름을 고려해 계층을 분리했습니다.

## Key Decisions

- 새로운 기능 개발보다 기존 멀티에이전트 시스템의 구조 정리와 문서화를 우선순위로 두었습니다 — 팀이 이해하지 못하는 시스템은 유지보수할 수 없다고 판단했기 때문입니다.
- 아키텍처 문서를 별도로 남겨, 인수인계 이후에도 팀이 참고할 수 있도록 했습니다.

## Result

백엔드 아키텍처와 API가 실제 팀 협업 환경에서 운영되었고, LangGraph 멀티에이전트 시스템은 정리된 문서와 함께 팀에 인수인계되었습니다.

## What I Learned

실제 팀 환경에서는 새 기능을 추가하는 것보다, 기존 시스템을 이해 가능한 상태로 만드는 것이 더 큰 가치를 만들 때가 있다는 것을 배웠습니다.
