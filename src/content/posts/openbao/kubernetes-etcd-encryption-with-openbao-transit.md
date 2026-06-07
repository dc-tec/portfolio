---
title: "Kubernetes Etcd Encryption With OpenBao Transit"
description: "A practical walkthrough of Kubernetes envelope encryption, KMS v2 providers, and a runnable kind lab using OpenBao Transit."
pubDatetime: 2026-06-07T00:00:00Z
featured: true
draft: false
tags:
  - openbao
  - kubernetes
  - kms
  - security
  - etcd
canonicalURL: "https://decort.tech/posts/openbao/kubernetes-etcd-encryption-with-openbao-transit/"
---

Kubernetes Secrets are API objects. While they move through the API server they are protected by authentication, authorization, admission, and audit controls, but they still end up as serialized data in etcd. If someone can read an etcd snapshot, an etcd disk, or an unmanaged backup, the storage layer becomes the question those API-level controls no longer answer.

Kubernetes has a native answer for this in encryption at rest. It can envelope-encrypt selected API resources before they are persisted, so the API server keeps doing the Kubernetes work while a configured encryption provider protects the storage encryption material. That provider is where a KMS fits in.

This post walks through the model and then uses a local kind lab to run Kubernetes KMS v2 against OpenBao Transit. The aim is to make the moving parts concrete enough that the production trade-offs are easier to reason about.

## The Useful Mental Model

Without encryption at rest, a Secret written through the Kubernetes API can still be stored in etcd in a form that exposes the original value to someone inspecting the storage layer.

With envelope encryption enabled for `secrets`, the storage path looks more like this:

```text
kubectl creates a Secret
  |
  v
kube-apiserver serializes the API object
  |
  v
kube-apiserver prepares storage encryption material
  |
  v
KMS v2 provider wraps or unwraps that material over a local Unix socket
  |
  v
OpenBao Transit performs cryptographic operations with managed key material
  |
  v
kube-apiserver writes a KMS v2 encrypted envelope to etcd
```

The important part is the boundary. The API server still owns Kubernetes object handling, OpenBao Transit owns the cryptographic key operation, and etcd stores encrypted Kubernetes resource data.

This does not make Secrets safe from every threat. It does not replace RBAC, and it does not protect values after a user or workload is authorized to read them through the API. It does not encrypt PersistentVolumes, pod filesystems, node filesystems, raw API traffic, or all etcd disk blocks. It specifically improves the storage-at-rest boundary for selected Kubernetes API resources.

## How Kubernetes KMS Providers Fit

Encryption at rest is driven by one file. `kube-apiserver` reads an `EncryptionConfiguration` passed through `--encryption-provider-config`, and that config decides which resources get encrypted and how.

A minimal KMS v2 configuration for Secrets looks like this:

```yaml file="encryption-config.yaml"
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: openbao-kms-dev-env
          endpoint: unix:///run/openbao-kms/kms.sock
          timeout: 3s
      - identity: {}
```

A few details in that small block matter more than they look. Order is the first one. The provider is listed first, so new writes for matching resources go through the KMS provider, while the `identity` provider sits last as a no-op fallback. That fallback is what keeps existing plaintext objects readable while you migrate them. Kubernetes encryption is applied on write, so existing resources are not rewritten just because the configuration changed.

The endpoint is local to the control-plane host. Kubernetes expects the provider plugin to listen on a Unix domain socket, so in a multi-control-plane cluster every API server needs its own local provider instance and the same stable provider name.

KMS v2 itself has three core calls:

- `Status`, where the provider reports health and the active `key_id`.
- `Encrypt`, where the API server sends plaintext key material and receives ciphertext plus metadata.
- `Decrypt`, where the API server sends stored ciphertext and metadata and receives plaintext key material back.

The `key_id` is not a secret, but it is part of the correctness contract, and Kubernetes requires it to be stable. If the provider reports one `key_id` in `Status` and returns another from `Encrypt`, the API server treats the result as unhealthy. If a provider reuses or flip-flops `key_id` values during rotation, old data can become ambiguous. That is why a KMS provider has to encode Kubernetes storage semantics on top of the crypto API it calls, which makes it more than a thin HTTP proxy.

## Why OpenBao Transit

Transit is OpenBao's encryption-as-a-service engine. It performs cryptographic operations while the key material stays managed inside OpenBao, and callers submit data to encrypt or decrypt and store the resulting ciphertext somewhere else. That model fits this boundary well.

For Kubernetes, the API server does not call Transit directly. It speaks the Kubernetes KMS gRPC protocol, which OpenBao Transit does not implement, so a provider sits in the middle:

```text
kube-apiserver
  -> unix:///run/openbao-kms/kms.sock
  -> bao-kms-provider
  -> OpenBao auth
  -> OpenBao Transit encrypt/decrypt
```

The provider in this walkthrough is [`bao-kms-provider`](https://github.com/dc-tec/openbao-kubernetes-kms). It adapts Kubernetes KMS v2 to OpenBao Transit and keeps the Kubernetes-specific behavior local to the provider:

- stable Kubernetes `key_id` derivation,
- explicit Transit key version selection on encrypt,
- local validation before decrypt,
- AAD binding for supported Transit key types,
- Unix socket ownership and permissions,
- health and Prometheus metrics for control-plane operations.

The provider authenticates to OpenBao through a configured auth method and receives a short-lived token in return. The lab uses the JWT auth method; the provider also supports TLS client-certificate auth, optionally with an HSM-backed key. Whichever method is used, the token's policy should be narrow. It needs to read Transit key metadata, encrypt with one configured key, decrypt with that same key, inspect Transit `disable_upsert`, and renew its own token. It should not be able to create, rotate, export, back up, or delete Transit keys.

## The Local Lab

The repository includes a dev environment that makes this concrete with kind. It creates:

- a single-control-plane kind cluster,
- an OpenBao server through Docker Compose,
- OpenBao Transit and provider auth through OpenTofu,
- a locally built `bao-kms-provider` image loaded into kind,
- a provider static pod on the kind control-plane node,
- a Kubernetes `EncryptionConfiguration` pointing at the provider socket,
- Prometheus and Grafana for local metrics.

The lab intentionally uses pinned inputs from the repository instead of floating tags. At the time of this draft, the local validation path uses:

```text
Kubernetes kind node:
kindest/node:v1.34.3@sha256:08497ee19eace7b4b5348db5c6a1591d7752b164530a36f855cb0f2bdcbadd48

OpenBao:
ghcr.io/openbao/openbao:2.5.4@sha256:436eaf9778cad75507ff70ea26ace30dcbe15606e619ac3823495663d7f7c115

Provider image:
ghcr.io/dc-tec/bao-kms-provider:dev-env
```

The provider image is built locally from the checkout and loaded into the kind node. The `dev-env` tag is local lab naming only, built fresh each run and meant to stay in the lab.

## How The Wiring Fits Together

`make dev-env-up` hides the wiring, but almost none of it is specific to kind. Any kubeadm-style control plane needs the same few placements, and seeing them directly beats treating the make target as a black box.

The kind cluster config is a single control-plane node and nothing else:

```yaml file="kind/cluster.yaml"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
```

There are no `extraMounts`, no `extraArgs`, and no encryption settings here. The encryption wiring is applied to the running control plane after the cluster exists, which is closer to how you would retrofit an existing cluster than it might first look.

**The provider runs as a static pod.** The lab renders a pod manifest and drops it into the kubelet's static manifest directory on the control-plane node:

```sh
docker cp bao-kms-provider.yaml \
  <node>:/etc/kubernetes/manifests/bao-kms-provider.yaml
```

kubelet watches `/etc/kubernetes/manifests` and starts whatever it finds there directly, without going through the API server. It runs as a static pod rather than a Deployment for a specific reason. The API server needs the provider to decrypt existing Secrets during startup, so the provider cannot depend on the API server to schedule it. The manifest host-mounts the provider config, CA bundle, JWT, the runtime socket directory, and a local state directory.

**The kube-apiserver is patched to use the provider.** With the provider in place, the API server's own static pod manifest gets three additions. First the encryption flag:

```text
--encryption-provider-config=/etc/kubernetes/encryption/openbao-kms/encryption-config.yaml
```

Then two host mounts, one read-only for the encryption config and one for the socket directory the provider listens on:

```yaml
volumeMounts:
  - name: openbao-kms-encryption
    mountPath: /etc/kubernetes/encryption/openbao-kms
    readOnly: true
  - name: openbao-kms-run
    mountPath: /run/openbao-kms
volumes:
  - name: openbao-kms-encryption
    hostPath:
      path: /etc/kubernetes/encryption/openbao-kms
      type: DirectoryOrCreate
  - name: openbao-kms-run
    hostPath:
      path: /run/openbao-kms
      type: Directory
```

Editing the API server manifest makes kubelet restart the API server pod, so the lab waits for `/readyz` and for the node to report `Ready` again before continuing. This is also why the provider has to be healthy first: a control plane that comes back up with the encryption flag set but no working provider cannot decrypt the Secrets already in etcd.

**The supporting files live at fixed host paths.** Everything the provider and API server read is staged onto the node ahead of time:

| File                | Host path                                                       |
| ------------------- | --------------------------------------------------------------- |
| Provider config     | `/etc/openbao-kms/config.yaml`                                  |
| OpenBao CA          | `/etc/openbao-kms/tls/openbao-ca.pem`                           |
| Provider JWT        | `/var/lib/openbao-kms/identity.jwt`                             |
| Encryption config   | `/etc/kubernetes/encryption/openbao-kms/encryption-config.yaml` |
| Provider static pod | `/etc/kubernetes/manifests/bao-kms-provider.yaml`               |

In the lab these are placed with `docker cp` into the kind node. On a real control-plane host they are ordinary files in ordinary directories, and that is the point. The moving parts stay the same on any control plane: a static pod, a patched API server manifest, and a handful of host-mounted files. kind contributes nothing special here.

## Run It

Install the local tools first:

- Docker with Compose v2
- kind
- kubectl
- OpenTofu
- OpenSSL
- Go, or set `IMAGE_PLATFORM` explicitly when building the image

With the wiring in mind, the lab runs the whole sequence from a clean checkout with one target:

```sh
git clone https://github.com/dc-tec/openbao-kubernetes-kms.git
cd openbao-kubernetes-kms

make dev-env-up
```

End to end, that single target performs the JWT-auth lab path:

1. Generate a local JWT signer, provider JWT, OpenBao TLS material, and a key lineage ID.
2. Create the kind cluster with the pinned node image.
3. Start OpenBao, Prometheus, and Grafana through Docker Compose.
4. Initialize and unseal OpenBao.
5. Build and load the provider image into kind.
6. Configure OpenBao Transit, policy, and JWT auth with OpenTofu.
7. Stage the provider config, CA, JWT, static pod manifest, and encryption config into the kind control-plane node.
8. Patch the API server static pod to use the encryption config and mount the provider socket path.
9. Verify Secret readback and raw etcd KMS v2 envelope storage.

Steps 7 and 8 are the placements from the previous section. The rest builds the OpenBao side and the provider image they depend on.

If you want to start over:

```sh
make dev-env-reset
make dev-env-up
```

To stop the lab but keep generated state for inspection:

```sh
make dev-env-down
```

To delete the generated state too:

```sh
make dev-env-reset
```

## Inspect What Was Created

The generated files live under `test/dev-env/.state/`, which git ignores, and the rendered Kubernetes-side files sit under `test/dev-env/.state/kind/`. The encryption config and static pod manifest are the artifacts described in the wiring section above. The provider config (`.state/kind/provider.yaml`) carries the identity fields that become part of the storage contract. Alongside the socket, OpenBao address, and auth stanza already covered, the fields that pin the storage identity are these:

```yaml
transit:
  mountPath: transit
  keyName: k8s-kind-dev-etcd
  keyIdScope:
    providerName: openbao-kms-dev-env
    clusterId: kind-dev-env
    transitMountId: transit-kind-dev
```

`providerName` has to match the name in the `EncryptionConfiguration`, and the two need to agree before any encrypted data exists. Together with `clusterId` and `transitMountId`, it feeds the stable `key_id` the provider reports to Kubernetes, which is exactly why these fields are awkward to change once data is encrypted.

You can also inspect the live control-plane node:

```sh
docker exec openbao-kms-dev-control-plane \
  test -S /run/openbao-kms/kms.sock

docker exec openbao-kms-dev-control-plane \
  crictl ps -a --name '^bao-kms-provider$'
```

## Prove The Secret Round Trip

Create a Secret with a value that is easy to search for:

```sh
KIND_CONTEXT=kind-openbao-kms-dev
SECRET_NAME=openbao-kms-blog-demo
SECRET_VALUE="blog-demo-$(openssl rand -hex 8)"

kubectl --context "$KIND_CONTEXT" delete secret "$SECRET_NAME" \
  --ignore-not-found

kubectl --context "$KIND_CONTEXT" create secret generic "$SECRET_NAME" \
  --from-literal=value="$SECRET_VALUE"
```

Read it back through the Kubernetes API:

```sh
kubectl --context "$KIND_CONTEXT" get secret "$SECRET_NAME" \
  -o jsonpath='{.data.value}' | base64 -d

printf '\n'
```

The output should match `SECRET_VALUE`, which proves the normal Kubernetes API path still works.

Now inspect the raw etcd value inside the kind control-plane node:

```sh
KIND_NODE=openbao-kms-dev-control-plane
ETCD_DUMP="$(mktemp)"

docker exec "$KIND_NODE" sh -c '
  set -eu
  cid="$(crictl ps --name etcd -q | head -n1)"
  crictl exec "$cid" etcdctl \
    --endpoints=https://127.0.0.1:2379 \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt \
    --cert=/etc/kubernetes/pki/etcd/server.crt \
    --key=/etc/kubernetes/pki/etcd/server.key \
    get /registry/secrets/default/openbao-kms-blog-demo
' > "$ETCD_DUMP"

grep -a 'k8s:enc:kms:v2:openbao-kms-dev-env:' "$ETCD_DUMP"

if grep -a -q "$SECRET_VALUE" "$ETCD_DUMP"; then
  echo "unexpected: plaintext was found in raw etcd output"
else
  echo "ok: plaintext was not found in raw etcd output"
fi

rm -f "$ETCD_DUMP"
```

The important marker is:

```text
k8s:enc:kms:v2:openbao-kms-dev-env:
```

That prefix is Kubernetes' storage envelope telling you the object was stored through the KMS v2 provider named `openbao-kms-dev-env`. The bytes after the prefix are encrypted storage data and metadata, and the original probe value should not appear anywhere in the raw etcd output.

Do not use this kind of etcd inspection casually in production. It requires high-privilege etcd access and can expose sensitive material if you dump the wrong object or store the output in logs. In this lab it is safe because the value is disposable and the whole environment is local.

## Look At The Provider Signals

The dev environment also starts Prometheus and Grafana. Print the Grafana URL:

```sh
make dev-env-grafana
```

The default lab URL is:

```text
http://127.0.0.1:18300
```

The username and password are both `admin`.

Prometheus is available at:

```text
http://127.0.0.1:19090
```

Useful metrics to query:

```text
openbao_kms_grpc_requests_total
openbao_kms_openbao_requests_total
openbao_kms_status_key_id_hash
openbao_kms_grpc_duration_seconds
```

After creating the Secret, the expected pattern looks like this: encrypt traffic increases on the provider, OpenBao Transit encrypt traffic increases alongside it, the API server can still read the Secret through normal Kubernetes APIs, raw etcd storage contains the KMS v2 envelope marker, and the provider reports one stable active key hash.

## What The OpenBao Side Did

The OpenTofu configuration in the lab creates the OpenBao side of the contract:

- a Transit mount at `transit`,
- `disable_upsert=true` for Transit key configuration,
- a Transit key named `k8s-kind-dev-etcd`,
- key type `aes256-gcm96`,
- export and plaintext backup disabled,
- deletion disabled,
- a provider policy limited to metadata read, encrypt, decrypt, `disable_upsert` inspection, `sys/capabilities-self`, and token renewal,
- a JWT auth backend and role bound to the generated provider JWT.

The provider token does not own the key lifecycle. It can use the configured key for the hot path, but it cannot create new Transit keys by typo, rotate the key, export key material, take plaintext backups, or delete the key.

That separation matters because the provider already sees sensitive material during Kubernetes KMS calls, and a compromise of that process is serious on its own. It should not also hand an attacker OpenBao key-administration authority.

## Where The Lab Differs From Production

The lab is deliberately small, good for understanding the path and testing changes. Availability is a separate question it does not try to answer, and on a real control plane the questions get stricter.

Start with where OpenBao runs. It should be available independently of the API server it protects, because running it only inside the same protected cluster creates a recovery loop: the API server needs the provider, the provider needs OpenBao, and OpenBao needs the API server. The provider makes that dependency sharper by sitting in the boot path. Once encrypted resources exist, an unavailable socket, provider process, OpenBao auth path, OpenBao service, or Transit key can leave the API server unable to decrypt data it needs at startup.

Identity is the next thing to get right. The provider name, cluster ID, OpenBao instance ID, Transit mount identity, key lineage ID, Transit key name, and mount path are long-lived storage contract values, and changing any of them after encryption begins needs a migration plan. The `identity` provider is the tool for that migration. It keeps existing plaintext objects readable while you rewrite them through the KMS provider, so leaving it in place too long weakens the storage posture, while removing it too early breaks reads of objects that were never rewritten.

Two operational items round it out. Backups have to match the encryption boundary, which means a recovery plan covers OpenBao Transit key material, Transit metadata, provider registry state, Kubernetes encryption config history, and proof that old encrypted data still decrypts after a restore. Artifacts should be verified before use too. The local `dev-env` image is a lab build, so a production rollout should use a selected release, a pinned image digest or verified host artifact, and a staged control-plane rollout.

## Clean Up

Delete the demo Secret:

```sh
kubectl --context kind-openbao-kms-dev delete secret openbao-kms-blog-demo
```

Stop the lab:

```sh
make dev-env-down
```

Remove the lab and generated local state:

```sh
make dev-env-reset
```

## What This Actually Gives You

Put the pieces together and the shape is simple. Kubernetes KMS integration is a control-plane storage boundary, OpenBao Transit supplies the external cryptographic service, and the provider sits between the two contracts. The provider is what keeps the Kubernetes-specific details local, including socket serving, KMS v2 `key_id` behavior, decrypt validation, Transit version selection, and operational health signals.

It is tempting to read this as "Secrets are safe now," but the accurate claim is narrower: selected Kubernetes API resources can be stored in etcd as KMS v2 encrypted envelopes, with OpenBao Transit holding the key operation outside etcd and outside the API server's local static encryption keys.

## Further Reading

- [Kubernetes: Encrypting confidential data at rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)
- [Kubernetes: Using a KMS provider for data encryption](https://kubernetes.io/docs/tasks/administer-cluster/kms-provider/)
- [OpenBao: Transit secrets engine](https://openbao.org/docs/secrets/transit/)
- [OpenBao: Transit API](https://openbao.org/api-docs/secret/transit/)
- [openbao-kubernetes-kms repository](https://github.com/dc-tec/openbao-kubernetes-kms)
- [openbao-kubernetes-kms docs](https://dc-tec.github.io/openbao-kubernetes-kms/)
