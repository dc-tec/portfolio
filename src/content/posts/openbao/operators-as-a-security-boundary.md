---
title: "Kubernetes Operators Are Security Boundaries"
description: "A practical look at how Kubernetes operators turn small API objects into privileged cluster changes, and how OpenBao Operator constrains that boundary."
pubDatetime: 2026-05-19T10:00:00Z
modDatetime: 2026-05-19T10:00:00Z
featured: true
draft: false
tags:
  - openbao
  - kubernetes
  - operators
  - security
canonicalURL: "https://decort.tech/posts/openbao/operators-as-a-security-boundary/"
---

Most people first meet a Kubernetes Operator as automation. A custom resource describes the desired state. A controller watches that resource and reconciles the cluster until reality matches the declared intent. For many workloads, that model is useful enough to get started. For platform services, it is incomplete.

Once an operator creates ServiceAccounts, RoleBindings, StatefulSets, Services, Jobs, ConfigMaps, Secrets, and status conditions on behalf of users, it is no longer just a reconcile loop. A small object submitted through the Kubernetes API can cause a more privileged identity to change the cluster, which puts the operator squarely inside the security boundary.

The operator is not the only boundary in play. The real boundary is the contract between the user-facing API, Kubernetes role-based access control (RBAC), admission policy, controller identity, and the child resources the controller is allowed to manage. The operator sits in the middle of that contract, and how broadly it is trusted decides whether the boundary is implicit or explicit.

Operators are not inherently unsafe, but they do deserve to be designed and reviewed as security-sensitive control planes. The important questions are practical: who can ask for work, which identity performs that work, what can it change, and what happens when the input or environment is wrong?

For most of the examples in this article I lean on the [OpenBao Operator](https://github.com/dc-tec/openbao-operator), which I wrote. It manages a secret management system on top of Kubernetes, including bootstrap, workload identity, tenant onboarding, backup, restore, Transport Layer Security (TLS), ingress, and software supply chain controls. That makes it a convenient illustration, but the patterns I want to talk about are not OpenBao-specific, and similar questions apply to operators like cert-manager, Argo CD, or the various database operators that have had to think through tenant scoping and RBAC over the years.

## The Threat Model Is Usually Ordinary

The threat model here is not limited to malicious controller code. Most operator risk is more ordinary than that:

- A tenant gets access to a custom resource definition (CRD) that triggers privileged writes.
- A broad controller ServiceAccount can reach more namespaces than intended.
- A GitOps or manual change mutates child resources outside the parent CRD contract.
- A missing admission policy silently weakens the design.
- A mutable image tag bypasses the artifact that was originally verified.
- A Secret permission intended for one workflow becomes namespace-wide Secret visibility.

None of these require exotic vulnerabilities. They are usually the result of normal permissions accumulating over time, especially when day-two workflows arrive after the first happy path.

A mechanical review helps. When looking at an operator, we should be able to point at the code or policy that answers these questions:

- Which identity is allowed to ask for work?
- Which identity actually performs the work?
- Which objects can it touch?
- Which object shapes are rejected before they are stored?
- What happens when the guardrails are missing?

## Operators Turn Intent Into Authority

The Kubernetes operator pattern extends the Kubernetes API with custom resource definitions (CRDs). A CRD gives users a new API type, and a controller turns objects of that type into concrete Kubernetes state. The security model lives in that translation step.

A user may only be allowed to create a small object, such as an `OpenBaoCluster` or `OpenBaoTenant`, and the controller then creates many other objects from it. That is the point of an operator: users express intent, and the controller handles the implementation detail. For a security reviewer, this is also where the CRD stops being configuration and starts being a delegation interface.

In this operator, the delegation is visible in the tenant API itself. The tenant object is small (it carries `TargetNamespace` plus optional fields for resource-quota and limit-range shaping of the tenant namespace), but it is still a request to provision real RBAC into another namespace.

```go file="api/v1alpha1/openbaotenant_types.go"
type OpenBaoTenantSpec struct {
	// TargetNamespace is the name of the namespace to provision with tenant RBAC.
	// The Provisioner will create Role and RoleBinding resources in this namespace
	// to grant the OpenBaoCluster controller permission to manage OpenBaoCluster
	// resources in that namespace.
	TargetNamespace string `json:"targetNamespace"`
}

// OpenBaoTenant is a governance CRD that explicitly declares which namespace
// should be provisioned with tenant RBAC.
type OpenBaoTenant struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   OpenBaoTenantSpec   `json:"spec"`
	Status OpenBaoTenantStatus `json:"status,omitempty"`
}
```

A user is not manually writing every Role, RoleBinding, ServiceAccount, and workload object. They are asking a controller to do it on their behalf, and the useful review questions follow from there:

- Who can create or update the custom resource?
- Which controller identity receives that request?
- Which namespaces can that identity reach?
- Which objects can it create, update, patch, delete, list, or watch?
- Can that identity grant itself or another identity more access?
- Which writes are rejected before they are persisted into state?
- Which failures cause the operator to stop, degrade, or continue?

When those answers are implicit, the platform is relying on convention. When they are written down in code and policy, the operator has a security architecture.

## Failure Modes: When One Broad Controller Becomes the Platform

The simplest operator architecture is one controller with one powerful ServiceAccount. It watches custom resources, lists whatever it needs, and creates whatever it needs. The shape is easy to implement and easy to understand, and for a small single-tenant deployment it may look harmless. The same operator identity creates the workload, patches the StatefulSet, reads a Secret, writes a ConfigMap, lists namespaces, and creates RoleBindings. The workflow succeeds, and the demo looks clean.

In a shared platform, the same shape gives you a larger blast radius than you probably wanted:

- A tenant-facing CRD can become a way to steer privileged writes.
- A controller that lists namespaces can discover more topology than it needs.
- A controller with broad Secret access can turn a narrow workflow into Secret browsing.
- RBAC writes can become self-escalation if names, subjects, verbs, and resources are not constrained.
- Manual or GitOps edits to operator-managed objects can bypass the parent CRD and create drift the controller is not designed to accept.

None of these issues require malicious code in the operator. They emerge from ordinary "make it work" permissions. Backup, restore, upgrades, bootstrap, certificate handling, and tenant onboarding all need authority, and if each new workflow adds more power to the same long-lived identity, the controller ends up with more authority than any single workflow requires.

This is not a hypothetical class of risk. Operator-shaped controllers have collected real CVEs around exactly this pattern, ranging from confused-deputy issues where a tenant resource could trigger writes the tenant should not have been able to perform, to controllers exposing cluster-wide read access because broad list/watch verbs were the easy way to make a feature work. The common thread is the same: an identity designed for one workflow grew until it could do many.

A good operator should not become a generic cluster management credential just because it automates a critical service.

## Split the Identity That Grants Access From the Identity That Uses It

The identity that grants access should not be the same identity that consumes it.

In this operator, tenant onboarding is handled by a provisioner, while ongoing workload reconciliation is handled by the controller identity. The provisioner introduces tenant access: it creates the fixed tenant Role and RoleBinding during onboarding, but the binding points at the controller ServiceAccount. The provisioner never grants those tenant permissions back to itself.

In practical terms, tenant namespaces (namespaces assigned to a team, application, or platform tenant) are not discovered and absorbed by a broad controller identity. They are introduced deliberately through an `OpenBaoTenant` onboarding flow, and the controller only receives narrow access in a namespace once it has been onboarded.

This is not just a design preference. An earlier version of this operator used label-based discovery: namespaces opted in by setting `openbao.org/tenant=true`, and the provisioner picked them up by listing and watching namespaces cluster-wide. The flow worked, but it forced the provisioner to hold namespace-wide list/watch as a normal-mode permission, which is exactly the broad capability the split is meant to remove. The `OpenBaoTenant` CRD replaced that flow. Tenant namespaces are now introduced by creating an explicit governance object, and the provisioner no longer needs list/watch on namespaces at all.

A few risks fall away as a result:

- The controller does not need generic namespace discovery as a normal workflow.
- The provisioner does not need to manage tenant workloads after onboarding.
- Tenant-scoped access is introduced through fixed RBAC objects instead of arbitrary RoleBinding creation.
- Security reviewers can reason about two smaller identities instead of one broad one.

Nothing about this is OpenBao-specific. Any operator that introduces access into tenant namespaces should ask whether onboarding and reconciliation can be split into separate trust surfaces. Cert-manager, for example, has spent a lot of design effort on namespace-scoped versus cluster-scoped issuers for exactly the same reason: who is allowed to ask for a certificate, and who is allowed to materialise one, are different questions with different blast radii.

## Admission Policy Makes the Boundary Executable

RBAC answers what an identity is allowed to ask the Kubernetes API to do. Admission policy answers a different question: even if the request reaches the API, is this object shape acceptable? It is an API server decision point that can validate or reject an object before Kubernetes stores it, and that distinction matters for operators.

RBAC can allow a provisioner to create Roles and RoleBindings in tenant namespaces; admission policy can still require that only specific Role names, subjects, verbs, and resources are acceptable. RBAC can allow a controller to write Secrets; admission policy can still require that only fixed operator-managed Secret names and labels are acceptable.

This design assumes a Kubernetes environment where `ValidatingAdmissionPolicy` is available for the target clusters. If that is not the case, the same security contract needs to be enforced through another admission mechanism, such as a policy engine or validating webhook.

The operator uses native `ValidatingAdmissionPolicy` guardrails for several families of rules:

- Managed-resource ownership.
- Custom resource validation.
- Provisioner RBAC and namespace restrictions.
- Controller RBAC, ServiceAccount, and Secret-write restrictions.
- Image digest enforcement for managed workloads.

The provisioner RBAC policy is a good example. It constrains the provisioner so it cannot manage tenant RBAC in system namespaces, cannot create arbitrary Role names, cannot broaden tenant Role content, and can only bind tenant RBAC to the operator controller ServiceAccount. Shortened, one of those checks looks like this:

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

The controller Secret-write policy works in the same way. It allows controller Secret writes only when the Secret has the expected operator labels and one of the fixed cluster-scoped names (TLS material and bootstrap-related Secrets owned by the operator).

The exact policy set is less important than the underlying rule: do not rely on controller code as the only place where unsafe object shapes are rejected. If a request can be denied at the Kubernetes API boundary, deny it there, so the reconcile loop is not the first and only line of defense.

## Fail Closed When Guardrails Are Part of the Design

If the operator depends on admission policy for its security model, that policy is not a decorative hardening layer. It should fail closed by default. When the required policy set is present and correctly bound, startup and sensitive reconciliation proceed. When the policy set is missing at startup, the operator refuses to start. When the required policies disappear or become misbound during the lifecycle, the operator pauses sensitive reconciliation and surfaces degraded status.

The startup path makes that explicit in code:

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

Failing closed is not free. A missing or broken policy can stop reconciliation, which has to be understood before production use. The failure mode needs to be visible, documented, and recoverable through an explicit break-glass path. What it should not be is an implicit default that lets the operator keep running with its guardrails removed.

If an operator claims that admission policy protects critical boundaries, it cannot silently continue normal operation when those policies disappear. Otherwise the system has two different security models: the one in the architecture document, and the one that actually runs during an incident.

## Managed Resources Should Have a Single Owner

Operators and GitOps systems meet at an awkward boundary. Both want declarative control of cluster objects, and when both write the same child object, the result is usually unclear ownership rather than useful collaboration.

For security-sensitive operators, this is more than a usability issue. Direct mutation of a child StatefulSet, Service, Pod, Secret, or RoleBinding can bypass validation that only exists on the parent CRD.

This operator addresses that with managed-resource mutation locks. The policy message is deliberately plain:

> Direct modification of OpenBao-managed resources is prohibited; modify the parent OpenBaoCluster/OpenBaoTenant instead.

The parent custom resource should be the supported API. Child objects should be implementation detail unless the operator explicitly documents an extension point. The pattern is worth copying, because it gives platform teams a cleaner operating model:

- Users change intent through the CRD.
- The operator changes owned child resources.
- GitOps applies the parent intent and operator installation.
- Admission rejects direct writes to managed resources unless an explicit maintenance path allows them.

Manual recovery is not the enemy here. The design includes explicit maintenance and break-glass concepts so manual changes can still happen during incidents. They just need to be controlled actions, not accidental side doors.

## Secrets Need Narrower Language Than "Read Secrets"

"The operator needs Secret access" is true of many operators and useless as a security statement. The interesting questions are narrower: which Secret names, in which namespace, for which workflow, and with which verbs?

In this operator, the controller should only access the specific Secret objects it needs for bootstrap, TLS management, and day-two operations. It should not gain generic tenant Secret visibility as a side effect. The admission policy reflects that scope. It does not authorize the controller to write Secrets in general, only to write operator-managed Secrets with expected labels and a small set of fixed cluster-scoped names:

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

Secret management operators sit close to sensitive material, and the platform should not be normalising generic Secret browsing as a side effect of automation. The same goes outside secret management: when an operator needs a credential, make the credential contract explicit, and when it only needs one name, do not grant a pattern that lets it inventory the namespace.

## Software Supply Chain Security Is Part of the Same Boundary

The same boundary question shows up in the software supply chain. An operator does not only decide which Kubernetes objects should exist, it often also decides which container image becomes the running workload. If the controller verifies `openbao:latest` and later writes `openbao:latest` into a StatefulSet, the running workload is not really tied to the verified artifact, because the tag can move between verification time and pull time.

The safer pattern is to make verification end in an immutable reference:

1. Resolve the image reference to a digest.
2. Verify the signature and expected identity for that digest.
3. Write the digest-pinned image into the managed workload.
4. Reject later writes that reintroduce mutable tags where digest enforcement is required.

A digest alone does not prove trust; it only gives immutability. Trust comes from verifying that digest against the expected signing identity, key, certificate identity, provenance, or transparency-log policy.

In this operator, the controller resolves a tag, verifies the signature and optional transparency-log evidence, and only then writes the verified digest into the workload spec. A separate admission policy enforces that managed StatefulSets and Jobs labeled for digest enforcement use `repo@sha256:...` image references for containers and init containers.

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

The final admission step does most of the work. Without it, the boundary lives only in controller code; with it, a human, GitOps pipeline, or future controller change that tries to write a managed workload with a mutable tag is rejected before the object persists.

The trust surface also needs to be split. The main OpenBao server image has a different signer, registry, and release cadence than the helper images used for init, backup, restore, and upgrade jobs. Treating those as one generic "image verification" setting hides an operationally relevant boundary, so this project models them separately through application image verification and operator helper image verification.

Signing an image is not the end of supply-chain security. The operator still has to answer the runtime questions: did we verify the exact artifact that will be pulled? Did we pin the workload to that artifact? Can an API write bypass that pinning? Are helper images held to their own trust policy? Those questions belong in the operator security model, because the operator is the component turning supply-chain evidence into running pods.

## The Costs

None of this is free, and it is worth being honest about what the design gives up.

Splitting the provisioner from the controller means two identities to install, audit, and rotate instead of one. It also means one more failure mode at install time, because if the provisioner's RBAC is wrong, tenant onboarding silently does the wrong thing. Operators with a single broad ServiceAccount avoid that whole class of mistakes.

Fail-closed admission policy is the most expensive piece operationally. A misconfigured policy or a CRD upgrade that drifts from the policy set will pause reconciliation rather than degrade gracefully. That is the correct behaviour for a security-sensitive controller, but it puts more weight on platform monitoring, on having a tested break-glass path, and on the team understanding why the operator is refusing to act. Operators that "just keep going" are easier to live with at 3 a.m., even when that ease is exactly the problem.

Image digest enforcement adds friction to development and to anything that wants to ship images on a moving tag, including some CI patterns. Helper-image verification with a separate trust surface doubles the signing and key management story.

These are real costs. The argument is not that they should always be paid, but that for an operator sitting on the security boundary of a platform service, they tend to be cheaper than the incident they prevent.

## Conclusion

Kubernetes Operators compress complex workflows into simple APIs, and that compression is what makes their security design matter. A CRD is a delegation interface as much as a configuration object. A controller is an identity with authority, not just a reconcile loop. Admission policy, when the operator depends on it, is the executable boundary between declared intent and unsafe persisted state.

The shape I keep coming back to in the OpenBao Operator is the split between provisioning and reconciliation. The provisioner introduces tenant access; the controller consumes tenant-scoped access. Admission policy keeps both identities inside narrow object shapes. Managed-resource locks keep unsupported mutation out of the normal path. Supply-chain verification ends in digest-pinned workloads, and admission prevents managed workloads from drifting back to mutable tags. None of that is specific to OpenBao.

If platform automation is going to be robust and reliable, operators need to be designed around their security contract from the start. The reconcile loop is the easy part. The contract around it is what makes the system safe to operate.
