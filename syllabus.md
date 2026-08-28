# Reliability Engineering for Distributed Systems

**Synthetic course.** This file exists so the pipeline has the two things it needs that a real course would supply: a **glossary** for transcription keyterm boosting and the term-correction pass, and an **assignment list** for the coursework-exclusion check at the reduce stage. No such course exists; no student is enrolled in anything.

The source talks are SRE and infrastructure war stories (see `SOURCES.md`), so the vocabulary and assignments are built around that material rather than around AI agents.

---

## Glossary

Terms likely to be spoken in the source talks and likely to be mis-transcribed — accented or not, these are low-frequency tokens with no surrounding context to recover them from. Passed to the transcription provider as keyterms and to the correction pass as the substitution vocabulary.

**Networking and kernel**
conntrack, netfilter, iptables, nftables, eBPF, XDP, Cilium, Calico, Martian packet, SNAT, DNAT, MTU, SYN, SYN packet, SYN flood, TCP RST, SYN backlog, ephemeral port exhaustion, TIME_WAIT, keepalive, MSS clamping, VXLAN, overlay network, network namespace, veth pair, CNI, kube-proxy, IPVS, reverse path filtering, RPF, ethtool, ENA, conntrack allowance exceeded, VPC

**DNS**
NXDOMAIN, SERVFAIL, ndots, search domain, resolv.conf, stub resolver, CoreDNS, NodeLocal DNSCache, cluster DNS, Route 53, dnsmasq, negative caching, TTL, glue record, recursive resolver, authoritative nameserver, EDNS0, UDP truncation

**Distributed systems and messaging**
NATS, Kafka, gRPC, HTTP/2 multiplexing, backpressure, head-of-line blocking, exactly-once delivery, at-least-once, idempotency key, quorum, Raft, Paxos, split brain, gossip protocol, vector clock, CRDT, eventual consistency, linearizability, tail latency, p99, coordinated omission, little's law, queueing delay, metastable failure, retry storm, thundering herd, circuit breaker, exponential backoff, jitter, load shedding, bulkhead

**Operations and incident practice**
SLO, SLI, error budget, burn rate, blameless postmortem, incident commander, MTTR, MTTD, toil, runbook, on-call rotation, paging policy, alert fatigue, cardinality explosion, observability, distributed tracing, span, flame graph, USE method, RED method, golden signals, chaos engineering, game day, canary deploy, blue-green, feature flag, rollback, capacity planning

**Platforms and tooling**
Kubernetes, StatefulSet, DaemonSet, sidecar, service mesh, Envoy, Istio, Prometheus, Grafana, OpenTelemetry, Datadog, PagerDuty, Terraform, Ansible, systemd, cgroup, OOM killer, Mastodon, ActivityPub, federation, Hachyderm

---

## Assignments

**Exclusion list.** Any build idea or agent prompt that substantially overlaps one of these is dropped at the reduce stage and re-checked by hand before approval. The point is to exercise that mechanism on realistic-looking coursework — these are written to sit deliberately close to the kinds of side project the pipeline will generate, because an exclusion list of obviously-unrelated assignments tests nothing.

### Assignment 1 — Incident postmortem analysis

Select three published postmortems from major providers. Write a comparative analysis identifying the failure class of each, the detection gap, and the contributing factors. Produce a timeline diagram for each incident and a one-page summary of what monitoring change would have shortened detection. Deliverable: 8–10 page report plus three diagrams.

### Assignment 2 — SLO design and error budget policy

For a service of your choosing, define three SLIs with measurement methodology, set SLOs with justification for each threshold, and write an error budget policy specifying what happens at 50%, 75%, and 100% burn. Implement the SLI queries against a Prometheus instance and produce a Grafana dashboard showing burn rate. Deliverable: policy document plus a working dashboard.

### Assignment 3 — Failure injection study

Build a small multi-service application and instrument it with distributed tracing. Design and execute a chaos experiment injecting at least three distinct failure modes (latency, packet loss, dependency unavailability). Document the hypothesis, the observed behavior, and the difference between them. Deliverable: experiment report plus the instrumented repository.

### Assignment 4 — Capacity model and load test

Construct a queueing model for a request-serving system, predicting p50 and p99 latency across a load range. Validate the model against a real load test and explain any divergence, addressing coordinated omission in the measurement methodology. Deliverable: model, test harness, and an analysis of where the model broke down.

---

## Notes for the pipeline

- The glossary is a **keyterm boosting** list first and a **correction vocabulary** second. Terms are listed in the casing they should appear in on the page.
- The assignment list is passed to the reduce stage as an exclusion list only. It is never rendered on the site.
- If a generated build idea reads like "instrument a service and inject failures" or "define SLOs for X," it is overlapping Assignments 3 and 2 and should be cut regardless of how good it is.
