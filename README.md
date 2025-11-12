# Saemtle Airple Monitoring Platform

Saemtle Airple is an end-to-end IoT solution that monitors rural reservoirs and ambient air quality. It combines embedded devices, MQTT messaging, Node.js services, and a responsive web dashboard to deliver real-time visibility and remote control for field engineers and municipal teams.

## Overview

- **Purpose**: Provide continuous telemetry, alerts, and manual controls for reservoir infrastructure and environmental sensors.
- **Stack**: Node.js, MySQL, MQTT, static web dashboard (HTML/CSS/JS), AWS EC2 deployment.
- **Protocols**: MQTT for device messaging, TCP sockets for firmware uploads, REST APIs for external consumers.
- **Scope**: Back-end services in `ubuntu/mqdb`, front-end assets in `test/dist`, automation scripts and templates in `test/src`.

## Architecture

1. **Edge Devices**
   - Publish sensor data (water level, temperature, voltage, airflow) over MQTT to the central broker.
   - Support image capture requests via TCP socket sessions.
2. **MQTT Ingestion (`ubuntu/mqdb/mqdb.js`)**
   - Subscribes to `mqdb-saemtle123`.
   - Persists telemetry and device state to MySQL (`sensordt`, `reservoir`, `users` tables).
   - Manages actuator commands, capture requests, and download jobs.
3. **REST API (`ubuntu/mqdb/api.js`)**
   - Exposes lightweight endpoints (e.g., `/api/sensordata`) for dashboards or third-party integrations.
4. **Database (`saemtleDb.sql`)**
   - Stores device registry, user accounts, reservoir metadata, and sensor history.
5. **Web Dashboard (`test/dist`)**
   - Static front-end bundled with Bootstrap and custom scripts for live charts, tables, and map overlays.

```mermaid
graph TD
    Edge[Edge Sensors & Controllers] -->|MQTT| Broker((MQTT Broker))
    Broker -->|Topic mqdb-saemtle123| MQService[mqdb.js Service]
    MQService -->|SQL Queries| MySQL[(MySQL)]
    MQService -->|REST| APIService[api.js Express API]
    APIService --> Dashboard[Web Dashboard]
    MQService -->|TCP Socket| Edge
```

## Key Features

- **Real-time Telemetry**: Persist and visualize reservoir levels, voltages, temperatures, airflow metrics.
- **Remote Actuation**: Update reservoir actuators (`act1open`) and configuration flags over MQTT/TCP.
- **Image Capture Pipeline**: Trigger photo uploads, receive base64 payloads, and archive on the server.
- **Role-Based Access**: Manage users with multiple privilege tiers (field operator, manager, super admin).
- **Data Export**: Retrieve historical sensor data for reporting and compliance.

## Directory Structure

```
.
├── README.md
├── saemtleDb.sql                 # Database schema and seed data
├── ubuntu/mqdb/                  # Node.js services
│   ├── api.js                    # Express API endpoints
│   ├── dbControl.js              # MySQL connection pool (mysql2/promise)
│   ├── mqdb.js                   # MQTT/TCP ingestion and command processor
│   └── package.json              # Service dependencies and scripts
├── test/                         # Front-end build pipeline (startbootstrap)
│   ├── dist/                     # Production-ready static dashboard
│   ├── src/                      # Pug, SCSS, JS sources
│   └── scripts/                  # Asset build tooling
└── security/                     # SSH keys and IDS (do not version sensitive secrets)
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8 (or compatible MariaDB)
- MQTT broker (e.g., Eclipse Mosquitto)
- AWS EC2 (or any Linux host) for deployment

## MQTT & TCP Interfaces

- **Topic**: `mqdb-saemtle123`
- **Inbound Commands**: `LOGIN_START`, `GET_RESERVOIR`, `PUT_CAPTURE`, `GET_SENSES`, etc.
- **Outbound Responses**: `LOGIN_START_VALIDATION`, `GET_SENSES_DONE`, `GET_CAPTURE_STATUS`, etc.
- **TCP Socket**: Port number handles base64 image uploads and direct device queries (`RSV_*`, `JPEG_IMG`, `CAPTURE_STATUS`).

Refer to `mqdb.js` for the complete command matrix and data parsing logic.

## REST API Summary

| Method | Endpoint             | Description                        |
| ------ | -------------------- | ---------------------------------- |
| GET    | `/api/users/:type`   | Placeholder endpoint returning `type`. |
| GET    | `/api/sensordata`    | Latest 10 sensor rows (descending). |

Extend `api.js` with additional routes for reservoir metadata, chart data, or alerts as needed.

## Logging & Observability

- `mqdb.js` uses Winston with daily rotate files stored under `log/system.log`.
- Console and file outputs share consistent formatting (`YYYY-MM-DD HH:MM:SS [LEVEL] message`).
- Review log rotation settings before production deployment.

## Deployment Checklist

- Build and upload dashboard assets from `test/dist` to the web server root.
- Run `mqdb.js` and `api.js` under a process manager (PM2, systemd) with restart policies.
- Monitor MySQL performance and configure backups for `sensordt` growth.
- Configure MQTT broker authentication and QoS 2 for guaranteed delivery.

