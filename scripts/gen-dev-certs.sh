#!/bin/bash
# Generate self-signed CA and agent certificates for local mTLS development
set -euo pipefail

CERT_DIR="./certs"
mkdir -p "$CERT_DIR"

echo "Generating CA key and certificate..."
openssl req -x509 -newkey rsa:4096 -keyout "$CERT_DIR/ca-key.pem" -out "$CERT_DIR/ca.pem" \
  -days 365 -nodes -subj "/CN=PokeMesh Dev CA/O=LoveLogicAI/C=US"

echo "Generating agent key and CSR..."
openssl req -newkey rsa:2048 -keyout "$CERT_DIR/agent-key.pem" -out "$CERT_DIR/agent.csr" \
  -nodes -subj "/CN=poke-mesh-agent/O=LoveLogicAI/C=US"

echo "Signing agent certificate with CA..."
openssl x509 -req -in "$CERT_DIR/agent.csr" -CA "$CERT_DIR/ca.pem" -CAkey "$CERT_DIR/ca-key.pem" \
  -CAcreateserial -out "$CERT_DIR/agent.pem" -days 365

rm "$CERT_DIR/agent.csr" "$CERT_DIR/ca.srl" 2>/dev/null || true

echo "Done. Certificates in $CERT_DIR/"
echo "  CA:    $CERT_DIR/ca.pem"
echo "  Agent: $CERT_DIR/agent.pem (key: $CERT_DIR/agent-key.pem)"
