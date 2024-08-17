#!/bin/bash

HOST=http://localhost:8081
AUTH_TOKEN=2:eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik9jQlJ4M3g5a3dBVklyN2RBdHFnNiJ9.eyJodHRwczovL2lkZW50aXR5LnNoYXJlZmFibGUuY29tL3VzZXIiOnsiZmFtaWx5TmFtZSI6Ikdvc3dhbWkiLCJnaXZlbk5hbWUiOiJBa2FzaCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJb0tFRXBRMHdhRUNoazA1bzRvWkFUUUtyal9ObTIxdVg5MXFkM0JIaXludDlIZlRNPXM5Ni1jIiwiZW1haWwiOiJha2FzaEBzaGFyZWZhYmxlLmNvbSJ9LCJpc3MiOiJodHRwczovL2Rldi12c2ZvYTJ5MWxoenZtZmljLnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwNzgxNTUzOTAxMjMyMzkwMDQzNiIsImF1ZCI6WyJiYWNrZW5kIiwiaHR0cHM6Ly9kZXYtdnNmb2EyeTFsaHp2bWZpYy51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzIzNzIwNjY5LCJleHAiOjE3MjM4MDcwNjksInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgb2ZmbGluZV9hY2Nlc3MiLCJhenAiOiJLd3VRWkxUNXdsRFN6UVJmRjREU25tSm54ZHRPRTA5ViIsInBlcm1pc3Npb25zIjpbInJlYWQ6c2NyZWVuIiwicmVhZDp0b3VyIiwidmlldzphbmFseXRpY3MiLCJ3cml0ZTpzY3JlZW4iLCJ3cml0ZTp0b3VyIl19.C9Vbhvjn0rNANSQkNVjKA1W1T50zbzJX-2wrc4AfZkWVhlwU2D8S87jbBHMT87fZOE-Y8AcoH7ypNjMUfB7tGVfMWeKB-18FWTWcxZFAPdPwkvZlXUd1VdE33qZLRAXjMu_0PYez1M8yL2X8xEpdn5yWQf9PWmtZxprEv3S5nqvuYLnvDmFEcfI2lZkUn3bDDxYf4kbGv-o6BxSWZBRYcM-Twtkk06WPq0Mrg6J0-_-whqz7FTAkhl-7mYrtNymntizGJ5Zk_5fNAiw7oB4j9M7m1zh_wI42EC0UJx1bGZQFfPF3RgdggWrnik2ci6TP8kpao3hA1YCfCQSYdZDkQQ

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