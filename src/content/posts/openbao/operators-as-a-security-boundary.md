---
title: "Kubernetes Operators Are Security Boundaries"
description: "A practical look at how Kubernetes operators turn small API objects into privileged cluster changes, and how OpenBao Operator constrains that boundary."
pubDatetime: 2026-05-19T10:00:00Z
modDatetime: 2026-05-23T00:50:00Z
featured: true
draft: false
tags:
  - openbao
  - kubernetes
  - operators
  - security
canonicalURL: "https://decort.tech/posts/openbao/operators-as-a-security-boundary/"
---

Most people first meet a Kubernetes Operator as automation. A custom resource describes the desired state. A controller watches it and reconciles the cluster until reality matches intent. That model is useful enough to get started, and for many workloads it is enough. For platform services, it is incomplete.

The real boundary is the contract between the user-facing API, Kubernetes role-based access control (RBAC), admission policy, controller identity, and the child resources the controller is allowed to manage. The operator sits in the middle of that contract. A small object submitted through the Kubernetes API can cause a more privileged identity to create ServiceAccounts, RoleBindings, StatefulSets, Secrets, and bindings across namespaces. Operators are security-sensitive control planes and should be designed as such.

When reviewing one, I want code or policy that answers five questions:

- Which identity is allowed to ask for work?
- Which identity actually performs the work?
- Which objects can it touch?
- Which object shapes are rejected before they are stored?
- What happens when the guardrails are missing?

If those questions don't have explicit answers in the operator's code or policies, the operator is running on team convention, and convention is harder to audit than code.

Most of the examples below come from the [OpenBao Operator](https://github.com/dc-tec/openbao-operator), which I'm developing. It manages a secret management system on Kubernetes, bootstrap, workload identity, tenant onboarding, backup, restore, TLS, ingress, and software supply chain controls. That makes it a convenient illustration, but none of the patterns are OpenBao-specific.

## The Threat Model Is Usually Ordinary

The threat here is rarely malicious controller code. Most operator risk is more ordinary:

- A tenant gets access to a CRD that triggers privileged writes.
- A broad controller ServiceAccount can reach more namespaces than intended.
- A GitOps or manual change mutates child resources outside the parent CRD contract.
- A missing admission policy silently weakens the design.
- A mutable image tag bypasses the artifact that was originally verified.
- A Secret permission intended for one workflow becomes namespace-wide Secret visibility.

None of these require exotic vulnerabilities. They emerge from normal permissions accumulating over time, especially when day-two workflows arrive after the first happy path.

## When One Broad Controller Becomes the Platform

The simplest operator architecture is one controller with one powerful ServiceAccount. It watches custom resources, lists whatever it needs, and creates whatever it needs. For a small single-tenant deployment, that may look harmless. The same identity creates the workload, patches the StatefulSet, reads a Secret, writes a ConfigMap, lists namespaces, and creates RoleBindings. The demo looks clean.

In a shared platform, that same setup gives you a larger blast radius than you wanted. A tenant-facing CRD becomes a way to steer privileged writes. A controller that lists namespaces discovers more topology than it needs. A controller with broad Secret access turns a narrow workflow into Secret browsing. RBAC writes become self-escalation when names, subjects, verbs, and resources are not constrained. Manual or GitOps edits to operator-managed objects bypass the parent CRD and create drift the controller is not designed to accept.

None of these issues require malicious code. They emerge from ordinary "make it work" permissions. Backup, restore, upgrades, bootstrap, certificate handling, and tenant onboarding all need authority. If each new workflow adds power to the same long-lived identity, the controller ends up with more authority than any single workflow requires.

This is not hypothetical. The Aiven Operator's CVE-2026-39961, disclosed in April 2026, is a recent example: a user with permission to create a `ClickhouseUser` or `ServiceUser` CRD could put a target namespace in the `connInfoSecretSource` field, and the operator's controller, running as its high-privileged ServiceAccount, would fetch the requested secret and write it where the CRD pointed. The CVE is filed under CWE-441 ("Unintended Proxy or Intermediary"), the formal name for the confused-deputy pattern, where a tenant resource triggers writes the tenant could not have performed directly. The common thread is the same: an identity designed for one workflow grew until it could do many.

A good operator should not become a generic cluster management credential just because it automates a critical service.

## Split the Identity That Grants Access From the Identity That Uses It

The identity that grants access should not be the same identity that consumes it.

In this operator, tenant onboarding is handled by a provisioner. Ongoing workload reconciliation is handled by the controller identity. The provisioner creates a fixed tenant Role and RoleBinding during onboarding, but the binding points at the controller ServiceAccount. The provisioner never grants those tenant permissions back to itself.

Tenant namespaces (namespaces assigned to a team, application, or platform tenant) are not discovered and absorbed by a broad controller identity. They are introduced deliberately through an `OpenBaoTenant` object, and the controller only receives narrow access in a namespace once it has been onboarded.

```go file="api/v1alpha1/openbaotenant_types.go"
type OpenBaoTenantSpec struct {
    // TargetNamespace is the namespace to provision with tenant RBAC.
    // The Provisioner will create Role and RoleBinding resources in this
    // namespace to grant the OpenBaoCluster controller permission to manage
    // OpenBaoCluster resources in that namespace.
    TargetNamespace string `json:"targetNamespace"`
}
```

An earlier version of this operator used label-based discovery instead. Namespaces opted in by setting `openbao.org/tenant=true`, and the provisioner picked them up by listing and watching namespaces cluster-wide. That worked, but it forced the provisioner to hold namespace-wide list/watch as a normal-mode permission, exactly the broad capability the split is meant to remove. The `OpenBaoTenant` CRD replaced that flow. Tenant namespaces are now introduced by creating an explicit governance object, and the provisioner no longer needs list/watch on namespaces at all.

This removes a few risks:

- The controller does not need generic namespace discovery as a normal workflow.
- The provisioner does not need to manage tenant workloads after onboarding.
- Tenant-scoped access is introduced through fixed RBAC objects instead of arbitrary RoleBinding creation.
- Reviewers can reason about two smaller identities instead of one broad one.

Nothing about this is OpenBao-specific. Cert-manager has spent considerable design effort on namespace-scoped versus cluster-scoped issuers for the same reason: who is allowed to ask for a certificate, and who is allowed to materialise one, are different questions with different blast radii. Any operator that introduces access into tenant namespaces should ask whether onboarding and reconciliation can be split.

## Admission Policy Makes the Boundary Executable

RBAC answers what an identity is allowed to ask the Kubernetes API to do. Admission policy answers a different question: even if the request reaches the API, is this object shape acceptable? It is an API server decision point that can validate or reject an object before Kubernetes stores it.

RBAC can allow a provisioner to create Roles and RoleBindings in tenant namespaces. Admission policy can still require that only specific Role names, subjects, verbs, and resources are acceptable. RBAC can allow a controller to write Secrets. Admission policy can still require that only fixed operator-managed Secret names and labels are acceptable.

This design assumes `ValidatingAdmissionPolicy` is available for the target clusters. If it is not, the same security contract needs to be enforced through another admission mechanism such as a policy engine or validating webhook.

The provisioner RBAC policy is a good example. It constrains the provisioner so it cannot manage tenant RBAC in system namespaces, cannot create arbitrary Role names, cannot broaden tenant Role content, and can only bind tenant RBAC to the operator controller ServiceAccount:

```yaml file="config/policy/openbao-restrict-provisioner-rbac.yaml"
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: openbao-restrict-provisioner-rbac
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["rbac.authorization.k8s.io"]
        operations: ["CREATE", "UPDATE", "DELETE"]
        resources: ["roles", "rolebindings"]
  validations:
    - expression: >-
        !variables.is_provisioner ||
        request.operation == 'DELETE' ||
        request.resource.resource != 'roles' ||
        object.metadata.name in [
          'openbao-operator-tenant-role',
          'openbao-operator-tenant-secrets-reader',
          'openbao-operator-tenant-secrets-writer'
        ]
      message: "The Provisioner can only create Roles for the operator tenant template."
```

The controller Secret-write policy works the same way: controller Secret writes are allowed only when the Secret has the expected operator labels and one of a small set of fixed cluster-scoped names.

The exact policy set matters less than the underlying rule: don't rely on controller code as the only place where unsafe object shapes are rejected. If a request can be denied at the API boundary, deny it there, so the reconcile loop is not the first and only line of defense.

## Fail Closed When Guardrails Are Part of the Design

When the operator depends on admission policy for its security model, that policy should fail closed by default. The operator checks for the required policy set at startup and refuses to start if anything is missing or unbound. Once running, it keeps watching for policy drift, and pauses sensitive reconciliation if a required policy disappears.

The startup path makes that explicit:

```go file="cmd/controller/startup_helpers.go"
if !admissionStatus.OverallReady {
    if err == nil {
        err = fmt.Errorf("admission policy dependencies not ready")
    }
    logging.LogAuditEvent(setupLog, logging.EventAdmissionStartupBlocked, map[string]string{
        "component":             "controller",
        "admission_enforcement": admissionEnforcement,
        "summary":               admissionStatus.SummaryMessage(),
    })
    setupLog.Error(err, "Admission policy dependencies not ready; refusing to start")
    os.Exit(1)
}
```

Failing closed has a cost. A missing or broken policy can stop reconciliation, which has to be understood before production use. The failure mode needs to be visible, documented, and recoverable through an explicit break-glass path. It cannot quietly drop back to running without those guardrails. Otherwise the documented security model isn't the one the operator is actually running.

## Managed Resources Should Have a Single Owner

Operators and GitOps systems meet at an awkward boundary. Both want declarative control of cluster objects, and when both write the same child object, the result is usually unclear ownership rather than useful collaboration.

For security-sensitive operators, direct mutation of a child StatefulSet, Service, Pod, Secret, or RoleBinding can bypass validation that only exists on the parent CRD. This operator addresses that with managed-resource mutation locks. The policy message is deliberately plain:

> Direct modification of OpenBao-managed resources is prohibited; modify the parent OpenBaoCluster/OpenBaoTenant instead.

The parent custom resource is the supported API. Child objects are implementation detail unless the operator documents an extension point. The resulting operating model is cleaner:

- Users change intent through the CRD.
- The operator changes owned child resources.
- GitOps applies the parent intent and the operator installation.
- Admission rejects direct writes to managed resources unless an explicit maintenance path allows them.

Manual recovery still has to be possible. The design includes explicit maintenance and break-glass concepts so manual changes can happen during incidents. They just need to be controlled actions, not accidental side doors.

## Secrets Need Narrower Language Than "Read Secrets"

"The operator needs Secret access" is true of many operators and useless as a security statement. The narrower question is what the controller can do, to which specific Secrets, in which namespace.

In this operator, the controller accesses specific Secret objects for bootstrap, TLS management, and day-two operations. It does not gain generic tenant Secret visibility as a side effect. The admission policy reflects that scope. It does not authorize the controller to write Secrets in general. It only allows operator-managed Secrets with expected labels and a small set of fixed cluster-scoped names:

```yaml file="config/policy/openbao-restrict-controller-secret-writes.yaml"
variables:
  - name: has_allowed_name
    expression: >-
      variables.cluster_name != "" &&
      variables.secret_name in [
        variables.cluster_name + "-tls-ca",
        variables.cluster_name + "-tls-server",
        variables.cluster_name + "-root-token",
        variables.cluster_name + "-unseal-key"
      ]
validations:
  - expression: >-
      !variables.is_controller ||
      (variables.has_required_labels && variables.has_allowed_name)
    message: "The controller can only create, update, or delete operator-managed Secret objects."
```

Secret management operators sit close to sensitive material, and the platform should not normalise generic Secret browsing as a side effect of automation. The same logic applies outside secret management. When an operator needs a credential, make the credential contract explicit. When it only needs one name, do not grant a pattern that lets it inventory the namespace.

## Software Supply Chain Security Is Part of the Same Boundary

The boundary question shows up in the software supply chain too. An operator decides which Kubernetes objects exist, and it often decides which container image becomes the running workload. If the controller verifies `openbao:latest` and later writes `openbao:latest` into a StatefulSet, the running workload is not really tied to the verified artifact — the tag can move between verification time and pull time.

The safer pattern ends verification in an immutable reference:

1. Resolve the image reference to a digest.
2. Verify the signature and expected identity for that digest.
3. Write the digest-pinned image into the managed workload.
4. Reject later writes that reintroduce mutable tags where digest enforcement is required.

A digest alone does not prove trust; it only gives immutability. Trust comes from verifying that digest against the expected signing identity, key, certificate identity, provenance, or transparency-log policy.

In this operator, the controller resolves a tag, verifies the signature and optional transparency-log evidence, then writes the verified digest into the workload spec. A separate admission policy enforces that managed StatefulSets and Jobs labeled for digest enforcement use `repo@sha256:...` image references for containers and init containers:

```yaml file="config/policy/openbao-enforce-managed-image-digests.yaml"
variables:
  - name: all_container_images_are_digests
    expression: >-
      !has(object.spec.template.spec.containers) ||
      object.spec.template.spec.containers.all(c,
        c.image.matches("^.+@sha256:[a-f0-9]{64}$"))
  - name: all_init_container_images_are_digests
    expression: >-
      !has(object.spec.template.spec.initContainers) ||
      object.spec.template.spec.initContainers.all(c,
        c.image.matches("^.+@sha256:[a-f0-9]{64}$"))
validations:
  - expression: >-
      !variables.is_openbao_managed ||
      !variables.digest_enforcement_required ||
      (variables.all_container_images_are_digests &&
      variables.all_init_container_images_are_digests)
```

That final admission step does most of the work. Without it, the boundary lives only in controller code. With it, a human, GitOps pipeline, or future controller change that tries to write a managed workload with a mutable tag is rejected before the object persists.

The trust surface also needs to be split. The main OpenBao server image has a different signer, registry, and release cadence than the helper images used for init, backup, restore, and upgrade jobs. Treating those as one generic "image verification" setting hides an operationally relevant boundary, so this project models them separately through application image verification and operator helper image verification.

Signing an image is not the end of supply-chain security. The operator is the component turning supply-chain evidence into running pods, which means it owns the runtime side of the contract: verifying the artifact at pull time, pinning the workload to it, rejecting later writes that reintroduce mutable tags, and applying a separate trust policy to helper images. The registry and the signing tool don't do any of that.

## The Costs

None of this is free, and it is worth being honest about what the design gives up.

Splitting the provisioner from the controller means two identities to install, audit, and rotate. It adds one more failure mode at install time. If the provisioner's RBAC is wrong, tenant onboarding silently does the wrong thing. Operators with a single broad ServiceAccount avoid that whole class of mistakes.

Fail-closed admission policy is the most expensive piece operationally. A misconfigured policy or a CRD upgrade that drifts from the policy set will pause reconciliation rather than degrade gracefully. That is the correct behaviour for a security-sensitive controller, but it puts more weight on platform monitoring, on having a tested break-glass path, and on the team understanding why the operator is refusing to act. Operators that "just keep going" are easier to live with, even when that ease is exactly the problem.

Image digest enforcement adds friction to development and to anything that wants to ship images on a moving tag, including some CI patterns. Helper-image verification with a separate trust surface doubles the signing and key management story.

For an operator on the security boundary of a platform service, these costs tend to be cheaper than the incident they prevent. For an operator running a developer-facing toy in a single-tenant cluster, they almost certainly aren't.

## Conclusion

The shape I keep coming back to in the OpenBao Operator is the split between provisioning and reconciliation. The provisioner introduces tenant access; the controller consumes tenant-scoped access. Admission policy keeps both identities inside narrow object shapes. Managed-resource locks keep unsupported mutation out of the normal path. Supply-chain verification ends in digest-pinned workloads, and admission prevents managed workloads from drifting back to mutable tags. None of that is specific to OpenBao.

What I am still working through is where the model genuinely doesn't fit. Fail-closed admission has clear costs in small clusters; the two-identity split has clear costs when there is no real tenant boundary to defend. The interesting design work is probably in identifying which of these controls earn their keep at which scale, rather than in arguing they always do.
