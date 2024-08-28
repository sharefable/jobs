#!/bin/bash

HOST=http://localhost:8081
AUTH_TOKEN=1:eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik9jQlJ4M3g5a3dBVklyN2RBdHFnNiJ9.eyJodHRwczovL2lkZW50aXR5LnNoYXJlZmFibGUuY29tL3VzZXIiOnsiZmFtaWx5TmFtZSI6Ikdvc3dhbWkiLCJnaXZlbk5hbWUiOiJBa2FzaCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJb0tFRXBRMHdhRUNoazA1bzRvWkFUUUtyal9ObTIxdVg5MXFkM0JIaXludDlIZlRNPXM5Ni1jIiwiZW1haWwiOiJha2FzaEBzaGFyZWZhYmxlLmNvbSJ9LCJpc3MiOiJodHRwczovL2Rldi12c2ZvYTJ5MWxoenZtZmljLnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwNzgxNTUzOTAxMjMyMzkwMDQzNiIsImF1ZCI6WyJiYWNrZW5kIiwiaHR0cHM6Ly9kZXYtdnNmb2EyeTFsaHp2bWZpYy51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzI0ODM1NTI5LCJleHAiOjE3MjQ5MjE5MjksInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgb2ZmbGluZV9hY2Nlc3MiLCJhenAiOiJLd3VRWkxUNXdsRFN6UVJmRjREU25tSm54ZHRPRTA5ViIsInBlcm1pc3Npb25zIjpbInJlYWQ6c2NyZWVuIiwicmVhZDp0b3VyIiwidmlldzphbmFseXRpY3MiLCJ3cml0ZTpzY3JlZW4iLCJ3cml0ZTp0b3VyIl19.J5xpaovvLuXt1a7M-Nrcu6ZCHtGP7Vo9YDACAQ4IrazozDOVc4JQ1WMMu79yFsY-jg4s3pEt7cQPLhhVpzqtZ9dVlqpn0dlWX2xHj46wkKDJ39MR8Rytb3x9NqCxe-rXShShldFff42Ib1m0cPEvGhpJPB_aTXaL6sjteE9MT3DyhfUnspG8PiXgPO6sitCMhAtCmYhzHzQzgQtMex8Eb15Ra5IJMVC-Y26RUDMnUOeVKL5o0grzd62uhxb-RKCNn6I-EcZc6KYBib8vVOwHKKZHGM0iTnWMGcNpSYBepRyn4IZwT3CUcx14DCHozl8q6XxwIg5hYQaBzX9UbovYfA

function auth_test() {
  curl \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    $HOST/v1/f/hello
}

function llm_ops_test() {
  curl -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
      "v": 1,
      "type": "create_demo",
      "model": "default",
      "system_payload": {
        "subtype": "create_new",
        "usecase": "marketing"
      },
      "user_payload": {
        "product_details": "A smart home automation system",
        "demo_objective": "Showcase the ease of use and energy-saving features",
        "refsForMMV": ["https://example.com/smart-home-demo"]
      }
    }' \
    $HOST/v1/f/llmops
}

function llm_ops_test() {
  curl -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
      "v": 1,
      "type": "create_demo",
      "model": "default",
      "system_payload": {
        "subtype": "create_new",
        "usecase": "marketing"
      },
      "user_payload": {
        "product_details": "A smart home automation system",
        "demo_objective": "Showcase the ease of use and energy-saving features",
        "refsForMMV": ["https://example.com/smart-home-demo"]
      }
    }' \
    $HOST/v1/f/llmops
}

function llm_ops_test_from_args() {
  curl -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$1" \
    $HOST/v1/f/llmops
}
