multipass list
multipass shell zipup
multipass shell unerring-baboon 
ssh hetzner
ss -lunp | grep 51820
docker kill $(docker ps -q)
docker ps
ls
ping 172.25.0.2
ping 10.13.13.2

curl -fsSL "https://raw.githubusercontent.com/ankitaabad/zipup/master/install.sh" | bash

rsync -avz  ./docker-compose.base.yaml ./docker-compose.release.yaml hetzner:/root/zipup/
docker ps
docker inspect postgres | grep IPAddress
docker exec -it wireguard sh
apk add tcpdump
iptables -t nat -L PREROUTING -n -v
wg-quick up wg0
ip route
wg show
docker inspect wireguard | grep -i NetworkMode
cat /etc/wireguard/wg0.conf
vi /etc/wireguard/wg0.conf
nc -vz 10.13.13.1 5432
nc -vz 10.13.13.4 9428
nc -vz 10.13.13.3 6379
docker exec -it wireguard sysctl net.ipv4.ip_forward
docker exec -it wireguard wg show
ip a | grep wg
docker logs zipup
docker logs openresty
docker logs wireguard
cd zipup

docker restart wireguard
docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml  down 

docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml up

 

docker compose down 

 clear