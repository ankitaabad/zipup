#!/bin/bash
set -e

# Wait a bit for Docker network and Postgres container to be ready
sleep 3

# Forward VPN traffic to Postgres container
iptables -A FORWARD -i wg0 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o wg0 -m state --state ESTABLISHED,RELATED -j ACCEPT
POSTGRES_IP=$(getent hosts postgres | awk '{ print $1 }')
iptables -t nat -A PREROUTING -i wg0 -p tcp --dport 5432 -j DNAT --to-destination $POSTGRES_IP:5432

# Start WireGuard
wg-quick up wg0

# Keep container running
tail -f /dev/null