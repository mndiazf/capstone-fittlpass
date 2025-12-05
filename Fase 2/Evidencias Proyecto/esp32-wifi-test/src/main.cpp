#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ===== WiFi =====
const char* WIFI_SSID = "mano";
const char* WIFI_PASS = "hola12321x";

// ===== MQTT (tu PC Windows con Mosquitto) =====
const char* MQTT_HOST = "10.91.239.208";   // <- IP de tu PC
const uint16_t MQTT_PORT = 1883;
const char* MQTT_CLIENTID = "esp32-door1";
const char* TOPIC_CMD   = "access/door1/cmd";   // recibe "OPEN" o JSON
const char* TOPIC_STATE = "access/door1/state"; // publica estados
const char* TOKEN_REQ   = "";                   // opcional: ej "SECRETO123"

// ===== SERVO MG90S =====
const int SERVO_PIN    = 13;  // señal en GPIO13
const int SERVO_CLOSED = 0;   // grados (ajusta según tu montaje)
const int SERVO_OPEN   = 90;  // grados (ajusta si necesitas más/menos recorrido)
uint32_t OPEN_MS       = 1500;      // tiempo abierto (ms)
const uint32_t COOLDOWN_MS = 2500;  // antirebote

WiFiClient wifi;
PubSubClient mqtt(wifi);
Servo gate;

enum DoorState { IDLE, OPENING, HOLDING, CLOSING, COOLDOWN };
DoorState state = IDLE;
uint32_t tMark = 0;

void publishState(const char* s){ mqtt.publish(TOPIC_STATE, s, true); }
void setServoDeg(int d){ gate.write(constrain(d,0,180)); }
void startOpen(){ if(state==IDLE){ state=OPENING; tMark=millis(); publishState("opening"); } }

// ---------- Conexiones ----------
void connectWiFi() {
  if (WiFi.status()==WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando a WiFi");
  while (WiFi.status()!=WL_CONNECTED){ delay(500); Serial.print("."); }
  Serial.printf("\nWiFi OK. IP: %s\n", WiFi.localIP().toString().c_str());
}

void connectMQTT() {
  if (mqtt.connected()) return;
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  while (!mqtt.connected()) {
    Serial.print("MQTT conectando...");
    if (mqtt.connect(MQTT_CLIENTID)) {
      Serial.println("OK");
      mqtt.subscribe(TOPIC_CMD);
      publishState("boot");
      publishState("idle");
    } else {
      Serial.printf("fail rc=%d\n", mqtt.state());
      delay(1000);
    }
  }
}

// Acepta "OPEN" o JSON {"cmd":"OPEN","ms":1500,"token":"..."}
bool parseCmd(char* topic, byte* payload, unsigned int len){
  if(String(topic)!=TOPIC_CMD) return false;
  String msg; msg.reserve(len); for(unsigned int i=0;i<len;i++) msg+=(char)payload[i]; msg.trim();
  if (msg.equalsIgnoreCase("OPEN")) return true;

  String up=msg; up.toUpperCase();
  if (up.indexOf("\"CMD\"")>=0 && up.indexOf("OPEN")>=0) {
    if (strlen(TOKEN_REQ)>0) { // validación opcional de token
      int t=msg.indexOf("\"token\""); if (t<0) return false;
      int c=msg.indexOf(':',t), q1=msg.indexOf('"',c+1), q2=msg.indexOf('"',q1+1);
      if (q1<0||q2<=q1) return false;
      String tok=msg.substring(q1+1,q2);
      if (tok!=TOKEN_REQ) return false;
    }
    int msU=up.indexOf("\"MS\"");
    if (msU>=0) {
      int msO=msg.indexOf("\"ms\"");
      int c=msg.indexOf(':',msO+1);
      if (c>0) { long v=msg.substring(c+1).toInt(); if (v>=500 && v<=5000) OPEN_MS=(uint32_t)v; }
    }
    return true;
  }
  return false;
}

void onMsg(char* topic, byte* payload, unsigned int len){
  if (parseCmd(topic,payload,len)) startOpen();
  else Serial.println("Comando ignorado");
}

void handleState(){
  uint32_t now=millis();
  switch(state){
    case OPENING: setServoDeg(SERVO_OPEN); state=HOLDING; tMark=now; break;
    case HOLDING: if(now-tMark>=OPEN_MS){ state=CLOSING; } break;
    case CLOSING: setServoDeg(SERVO_CLOSED); publishState("closed"); state=COOLDOWN; tMark=now; break;
    case COOLDOWN: if(now-tMark>=COOLDOWN_MS){ state=IDLE; publishState("idle"); } break;
    default: break;
  }
}

void setup(){
  Serial.begin(115200);

  // Servo 50Hz — alimenta con 5V EXTERNA y une GND con el ESP32
  ESP32PWM::allocateTimer(0); ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2); ESP32PWM::allocateTimer(3);
  gate.setPeriodHertz(50);
  gate.attach(SERVO_PIN, 500, 2500);  // ajusta a 600..2400 si vibra
  setServoDeg(SERVO_CLOSED);

  connectWiFi();
  mqtt.setCallback(onMsg);
}

void loop(){
  connectWiFi();
  connectMQTT();
  mqtt.loop();
  handleState();
}
