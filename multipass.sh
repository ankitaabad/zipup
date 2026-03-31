 multipass shell zipup

 curl -fsSL "https://raw.githubusercontent.com/ankitaabad/zipup/master/install.sh" | bash

 docker logs zipup

 cd zipup

 docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml  down

 docker compose -f docker-compose.base.yaml -f docker-compose.release.yaml up
 
 docker compose down 
 docker ps

 docker kill $(docker ps -q)

 clear