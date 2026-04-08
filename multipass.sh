 multipass list
 multipass shell zipup
 multipass shell unerring-baboon 
 ssh hetzner
 ls
 ping 172.25.0.2
 curl -fsSL "https://raw.githubusercontent.com/ankitaabad/zipup/master/install.sh" | bash

 docker ps
 docker logs zipup
 docker logs openresty
 docker logs wireguard
 cd zipup

  docker restart zipup
 docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml  down

 docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml up

 

 docker compose down 
 docker kill $(docker ps -q)

 clear