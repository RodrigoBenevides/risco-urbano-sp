"""Mede quanto tempo uma observação leva do retorno do POST à árvore de UI Android."""

import argparse
import json
import math
import os
import statistics
import subprocess
import time
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


def emitir(base, valor):
    corpo = {
        "chave": str(uuid.uuid4()), "tipo": "ALAGAMENTO", "bairro": "Vila Mariana",
        "unidade": "cm", "valor": valor, "observadoEm": datetime.now(timezone.utc).isoformat(),
    }
    req = Request(base.rstrip("/") + "/api/demo/sensores", data=json.dumps(corpo).encode(),
                  headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=8) as resposta:
        return json.load(resposta)


def executar_adb(prefixo, *argumentos):
    resultado = subprocess.run([*prefixo, *argumentos], capture_output=True, timeout=12, check=True)
    return resultado.stdout.decode("utf-8", errors="replace")


def contem_observacao(prefixo, arquivo, identificador):
    status = executar_adb(prefixo, "shell", "uiautomator", "dump", arquivo)
    if "dumped" not in status.lower():
        raise RuntimeError(status.strip() or "Falha ao coletar a árvore de acessibilidade")
    xml = executar_adb(prefixo, "exec-out", "cat", arquivo)
    arvore = ET.fromstring(xml)
    nome = "observacao-" + identificador
    return any(no.get("resource-id", "").split("/")[-1] == nome
               or no.get("content-desc") == nome for no in arvore.iter("node"))


def principal():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api", default="http://127.0.0.1:8080")
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--serial")
    parser.add_argument("--amostras", type=int, default=20)
    parser.add_argument("--saida", type=Path, required=True)
    args = parser.parse_args()
    if args.amostras < 1:
        parser.error("O número de amostras deve ser positivo.")
    prefixo = [args.adb] + (["-s", args.serial] if args.serial else [])
    serial = executar_adb(prefixo, "get-serialno").strip()
    modelo = executar_adb(prefixo, "shell", "getprop", "ro.product.model").strip()
    api_android = executar_adb(prefixo, "shell", "getprop", "ro.build.version.sdk").strip()
    arquivo = f"/data/local/tmp/risco-urbano-ui-{os.getpid()}.xml"
    amostras = []
    try:
        for indice in range(args.amostras):
            gravado = emitir(args.api, 22 + indice % 4)
            inicio = time.monotonic()
            obs_id = str(gravado["id"])
            sondagens, falhas_coleta, duracoes = 0, [], []
            visivel = False
            while time.monotonic() - inicio < 15:
                t = time.monotonic()
                sondagens += 1
                try:
                    visivel = contem_observacao(prefixo, arquivo, obs_id)
                except (RuntimeError, ET.ParseError, subprocess.SubprocessError) as erro:
                    falhas_coleta.append(str(erro)[:160])
                duracoes.append(round((time.monotonic() - t) * 1000))
                if visivel:
                    break
                time.sleep(0.15)
            atraso = round((time.monotonic() - inicio) * 1000) if visivel else None
            amostras.append({"observacaoId": obs_id, "alertaId": gravado["alertaId"],
                            "atrasoMs": atraso, "sondagens": sondagens,
                            "duracoesSondaMs": duracoes, "errosSonda": falhas_coleta})
            print(f"{indice + 1}/{args.amostras}: {atraso} ms", flush=True)
    finally:
        subprocess.run([*prefixo, "shell", "rm", "-f", arquivo], capture_output=True, timeout=10)
        tempos = sorted(x["atrasoMs"] for x in amostras if x["atrasoMs"] is not None)
        relatorio = {
            "medidoEm": datetime.now(timezone.utc).isoformat(), "android": modelo, "apiAndroid": api_android,
            "serial": serial, "amostras": amostras, "visiveis": len(tempos), "planejadas": args.amostras,
            "medianaMs": statistics.median(tempos) if tempos else None,
            "p95Ms": tempos[math.ceil(0.95 * len(tempos)) - 1] if tempos else None,
            "maximoMs": max(tempos, default=None),
            "metodo": "Relógio monotônico do host, do retorno do POST até a primeira árvore visível contendo o ID da nova observação no detalhe. O tempo inclui a coleta por ADB.",
        }
        args.saida.parent.mkdir(parents=True, exist_ok=True)
        args.saida.write_text(json.dumps(relatorio, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if len(tempos) != args.amostras:
        raise SystemExit("Uma ou mais amostras não ficaram visíveis no intervalo observado.")


if __name__ == "__main__":
    principal()
