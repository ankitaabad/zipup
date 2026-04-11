multipass list
multipass shell zipup
ss -lunp | grep 51820
docker kill $(docker ps -q)
docker ps
ls
ping 172.25.0.2
ping 10.13.13.2

code ~/.ssh/config
ssh hetzner
redis-cli -h 10.13.13.1 -p 6379
curl -fsSL "https://raw.githubusercontent.com/ankitaabad/zipup/master/install.sh" | bash
sudo iptables -P FORWARD ACCEPT
rsync -avz  ./docker-compose.base.yaml ./docker-compose.release.yaml hetzner:/root/zipup/
docker ps
sudo docker inspect postgres | grep IPAddress
sudo docker exec -it openresty sh
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
docker exec -it openresty sh
cat /etc/openresty/account.key
ip a | grep wg
docker logs zipup
docker logs openresty
docker logs wireguard
cd zipup

docker restart wireguard
cd zipup
docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml  down -v

docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml up

 

docker compose down 

 clear