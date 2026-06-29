docker stop routix
docker rm routix
docker build -t routix .
docker run -d --name routix -p 20128:20128 --env-file .env -v routix-data:/app/data routix