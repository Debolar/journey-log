# Tell Terraform which plugin (provider) it needs
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Connect to Docker Desktop on Windows
provider "docker" {
  host = "npipe:////./pipe/docker_engine"
}

# Download the nginx image
resource "docker_image" "nginx" {
  name = "nginx:stable-alpine"
}

# Run a container from that image
resource "docker_container" "web" {
  name  = "terraform-web"
  image = docker_image.nginx.image_id

  ports {
    internal = 80
    external = 8090
  }
}