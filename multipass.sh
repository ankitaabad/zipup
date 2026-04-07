 multipass list
 multipass shell zipup
 multipass shell unerring-baboon 

 curl -fsSL "https://raw.githubusercontent.com/ankitaabad/zipup/master/install.sh" | bash

 docker ps
 docker logs zipup
 docker logs openresty

 cd zipup

 docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml  down

 docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml up

 

 docker compose down 
 docker kill $(docker ps -q)

 clear