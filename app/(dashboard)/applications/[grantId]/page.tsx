     1|'use client';
     2|
     3|import { useEffect, useState, use, useCallback } from 'react';
     4|import Link from 'next/link';
     5|import { Button } from '@/components/ui/button';
     6|import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
     7|import { Textarea } from '@/components/ui/textarea';
     8|import { Badge } from '@/components/ui/badge';
     9|import { Skeleton } from '@/components/ui/skeleton';
    10|import type { Grant, ApplicationQuestion, UsageStatus } from '@/types';
    11|
    12|interface PageProps {
    13|  params: Promise<{ grantId: string }>;
    14|}
    15|
    16|export default function ApplicationPage({ params }: PageProps) {
    17|  const { grantId } = use(params);
    18|  const [grant, setGrant] = useState<Grant | null>(null);
    19|  const [loading, setLoading] = useState(true);
    20|  const [answers, setAnswers] = useState<Record<string, string>>({});
    21|  const [originalAnswers, setOriginalAnswers] = useState<Record<string, string>>({});
    22|  const [generating, setGenerating] = useState<Record<string, boolean>>({});
    23|  const [generated, setGenerated] = useState<Record<string, boolean>>({});
    24|  const [errors, setErrors] = useState<Record<string, string>>({});
    25|  const [copied, setCopied] = useState<Record<string, boolean>>({});
    26|  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
    27|
    28|  // Fetch usage status
    29|  const fetchUsage = useCallback(async () => {
    30|    try {
    31|      const res = await fetch('/api/usage');
    32|      if (res.ok) {
    33|        const data = await res.json();
    34|        setUsage(data.data);
    35|      }
    36|    } catch (error) {
    37|      console.error('Failed to fetch usage:', error);
    38|    }
    39|  }, []);
    40|
    41|  useEffect(() => {
    42|    async function fetchGrant() {
    43|      const res = await fetch(`/api/grants/${grantId}`);
    44|      if (res.ok) {
    45|        const data = await res.json();
    46|        setGrant(data.data);
    47|      }
    48|      setLoading(false);
    49|    }
    50|    fetchGrant();
    51|    fetchUsage();
    52|  }, [grantId, fetchUsage]);
    53|
    54|  // Track answer edits
    55|  const trackEdit = async (questionId: string, originalAnswer: string, editedAnswer: string) => {
    56|    if (originalAnswer === editedAnswer) return;
    57|
    58|    try {
    59|      await fetch('/api/applications/track-edit', {
    60|        method: 'POST',
    61|        headers: { 'Content-Type': 'application/json' },
    62|        body: JSON.stringify({
    63|          grantId,
    64|          questionId,
    65|          originalAnswer,
    66|          editedAnswer,
    67|        }),
    68|      });
    69|    } catch (error) {
    70|      console.error('Failed to track edit:', error);
    71|    }
    72|  };
    73|
    74|  // Handle answer change with edit tracking
    75|  const handleAnswerChange = (questionId: string, newValue: string) => {
    76|    setAnswers((prev) => ({ ...prev, [questionId]: newValue }));
    77|  };
    78|
    79|  // Track edit on blur if answer was modified
    80|  const handleAnswerBlur = (questionId: string) => {
    81|    const original = originalAnswers[questionId];
    82|    const current = answers[questionId];
    83|    if (original && current && original !== current) {
    84|      trackEdit(questionId, original, current);
    85|    }
    86|  };
    87|
    88|  const copyToClipboard = async (questionId: string, text: string) => {
    89|    try {
    90|      await navigator.clipboard.writeText(text);
    91|      setCopied((prev) => ({ ...prev, [questionId]: true }));
    92|      setTimeout(() => {
    93|        setCopied((prev) => ({ ...prev, [questionId]: false }));
    94|      }, 2000);
    95|    } catch (error) {
    96|      console.error('Failed to copy:', error);
    97|    }
    98|  };
    99|
   100|  const generateAnswer = async (questionId: string, question: string, maxLength?: number) => {
   101|    setGenerating((prev) => ({ ...prev, [questionId]: true }));
   102|    setErrors((prev) => ({ ...prev, [questionId]: '' }));
   103|
   104|    try {
   105|      const res = await fetch('/api/applications/generate', {
   106|        method: 'POST',
   107|        headers: { 'Content-Type': 'application/json' },
   108|        body: JSON.stringify({
   109|          question,
   110|          grantName: grant?.name,
   111|          maxLength,
   112|        }),
   113|      });
   114|
   115|      if (!res.ok) {
   116|        const errorData = await res.json().catch(() => ({}));
   117|        throw new Error(errorData.error || 'Generation failed');
   118|      }
   119|
   120|      const { data } = await res.json();
   121|      const fullAnswer = data.answer;
   122|
   123|      // Display the answer immediately
   124|      setAnswers((prev) => ({ ...prev, [questionId]: fullAnswer }));
   125|      setOriginalAnswers((prev) => ({ ...prev, [questionId]: fullAnswer }));
   126|      setGenerated((prev) => ({ ...prev, [questionId]: true }));
   127|
   128|      // Refresh usage after generation
   129|      fetchUsage();
   130|    } catch (error) {
   131|      console.error('Generation error:', error);
   132|      setErrors((prev) => ({
   133|        ...prev,
   134|        [questionId]: error instanceof Error ? error.message : 'Generation failed',
   135|      }));
   136|    } finally {
   137|      setGenerating((prev) => ({ ...prev, [questionId]: false }));
   138|    }
   139|  };
   140|
   141|  
  const handleSaveAsDraft = async () => {
    if (!grant) return;
    setSaving(true);
    try {
      const res = await fetch('/api/applications', {
        method: applicationId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(applicationId && { id: applicationId }),
          grantId,
          answers,
          status: 'draft',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!applicationId && data.data) setApplicationId(data.data.id);
        setOriginalAnswers(answers);
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateAllAnswers = async () => {
   142|    if (!grant?.application_questions) return;
   143|
   144|    for (const q of grant.application_questions) {
   145|      if (!generated[q.id]) {
   146|        await generateAnswer(q.id, q.question, q.max_length);
   147|      }
   148|    }
   149|  };
   150|
   151|  if (loading) {
   152|    return (
   153|      <div className="space-y-6">
   154|        <Skeleton className="h-8 w-64" />
   155|        <Skeleton className="h-4 w-96" />
   156|        <div className="space-y-4">
   157|          {[1, 2, 3].map((i) => (
   158|            <Skeleton key={i} className="h-48 w-full" />
   159|          ))}
   160|        </div>
   161|      </div>
   162|    );
   163|  }
   164|
   165|  if (!grant) {
   166|    return (
   167|      <div className="text-center py-12">
   168|        <h2 className="text-xl font-semibold">Grant not found</h2>
   169|        <p className="text-muted-foreground mt-2">
   170|          The grant you&apos;re looking for doesn&apos;t exist.
   171|        </p>
   172|        <Button asChild className="mt-4">
   173|          <Link href="/grants">Browse Grants</Link>
   174|        </Button>
   175|      </div>
   176|    );
   177|  }
   178|
   179|  const questions = grant.application_questions as ApplicationQuestion[];
   180|  const isUsageLow = usage && (usage.answers_remaining <= 10 || usage.applications_remaining_today <= 2);
   181|  const isUsageCritical = usage && (usage.answers_remaining <= 5 || usage.applications_remaining_today <= 1);
   182|
   183|  return (
   184|    <div className="space-y-6">
   185|      {/* Back Link */}
   186|      <Link
   187|        href="/applications"
   188|        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
   189|      >
   190|        <svg
   191|          xmlns="http://www.w3.org/2000/svg"
   192|          className="h-4 w-4 mr-1"
   193|          viewBox="0 0 24 24"
   194|          fill="none"
   195|          stroke="currentColor"
   196|          strokeWidth={2}
   197|        >
   198|          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
   199|        </svg>
   200|        Back to Applications
   201|      </Link>
   202|
   203|      {/* Header */}
   204|      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
   205|        <div>
   206|          <Badge variant="outline" className="mb-2">
   207|            {grant.provider_type.charAt(0).toUpperCase() + grant.provider_type.slice(1)}
   208|          </Badge>
   209|          <h1 className="text-2xl font-bold">{grant.name}</h1>
   210|          <p className="text-muted-foreground">{grant.provider}</p>
   211|        </div>
   212|        <Button onClick={generateAllAnswers} size="lg" className="shrink-0">
   213|          <svg
   214|            xmlns="http://www.w3.org/2000/svg"
   215|            className="h-5 w-5 mr-2"
   216|            viewBox="0 0 24 24"
   217|            fill="none"
   218|            stroke="currentColor"
   219|            strokeWidth={2}
   220|          >
   221|            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.636 5.636l2.122 2.122m8.484 8.484l2.122 2.122M5.636 18.364l2.122-2.122m8.484-8.484l2.122-2.122" />
   222|          </svg>
   223|          Generate All Answers with AI
   224|        </Button>
   225|      </div>
   226|
   227|      {/* Usage Banner */}
   228|      {usage && (
   229|        <div className={`rounded-lg p-4 border ${
   230|          isUsageCritical
   231|            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
   232|            : isUsageLow
   233|              ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
   234|              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
   235|        }`}>
   236|          <div className="flex flex-wrap gap-4 text-sm">
   237|            <div className="flex items-center gap-2">
   238|              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
   239|                <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
   240|              </svg>
   241|              <span className={isUsageCritical ? 'text-red-700 dark:text-red-300 font-medium' : ''}>
   242|                {usage.answers_remaining} of {usage.lifetime_limit} AI answers remaining
   243|              </span>
   244|            </div>
   245|            <div className="flex items-center gap-2">
   246|              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
   247|                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
   248|                <line x1="16" x2="16" y1="2" y2="6" />
   249|                <line x1="8" x2="8" y1="2" y2="6" />
   250|                <line x1="3" x2="21" y1="10" y2="10" />
   251|              </svg>
   252|              <span>
   253|                {usage.applications_remaining_today} of {usage.daily_limit} applications today
   254|              </span>
   255|            </div>
   256|          </div>
   257|        </div>
   258|      )}
   259|
   260|      {/* How It Works Banner */}
   261|      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
   262|        <div className="flex gap-3">
   263|          <svg
   264|            xmlns="http://www.w3.org/2000/svg"
   265|            className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
   266|            viewBox="0 0 24 24"
   267|            fill="none"
   268|            stroke="currentColor"
   269|            strokeWidth={2}
   270|          >
   271|            <circle cx="12" cy="12" r="10" />
   272|            <path d="M12 16v-4M12 8h.01" />
   273|          </svg>
   274|          <div className="text-sm text-blue-800 dark:text-blue-200">
   275|            <p className="font-medium">How to Apply</p>
   276|            <p className="mt-1 text-blue-700 dark:text-blue-300">
   277|              Since we can&apos;t control external grant portals, please <strong>copy each generated answer</strong> and paste it into the actual application form. Click &quot;Open Application Portal&quot; below to access the grant website.
   278|            </p>
   279|          </div>
   280|        </div>
   281|      </div>
   282|
   283|      {/* Questions */}
   284|      <div className="space-y-6">
   285|        {questions && questions.length > 0 ? (
   286|          questions.map((q, index) => (
   287|            <Card key={q.id}>
   288|              <CardHeader>
   289|                <div className="flex items-start justify-between gap-4">
   290|                  <div className="flex gap-3">
   291|                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-medium">
   292|                      {index + 1}
   293|                    </span>
   294|                    <div>
   295|                      <CardTitle className="text-base font-medium leading-relaxed">
   296|                        {q.question}
   297|                      </CardTitle>
   298|                      <CardDescription className="mt-1">
   299|                        {q.max_length && `Max ${q.max_length} characters`}
   300|                        {q.required && (q.max_length ? ' • ' : '')}
   301|                        {q.required && 'Required'}
   302|                      </CardDescription>
   303|                    </div>
   304|                  </div>
   305|                  <div className="flex gap-2">
   306|                    {generated[q.id] && answers[q.id] && (
   307|                      <Button
   308|                        variant="outline"
   309|                        size="sm"
   310|                        onClick={() => copyToClipboard(q.id, answers[q.id])}
   311|                        className={copied[q.id] ? 'bg-green-100 text-green-800 border-green-300' : ''}
   312|                      >
   313|                        {copied[q.id] ? (
   314|                          <>
   315|                            <svg
   316|                              xmlns="http://www.w3.org/2000/svg"
   317|                              className="h-4 w-4 mr-1"
   318|                              viewBox="0 0 24 24"
   319|                              fill="none"
   320|                              stroke="currentColor"
   321|                              strokeWidth={2}
   322|                            >
   323|                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
   324|                            </svg>
   325|                            Copied!
   326|                          </>
   327|                        ) : (
   328|                          <>
   329|                            <svg
   330|                              xmlns="http://www.w3.org/2000/svg"
   331|                              className="h-4 w-4 mr-1"
   332|                              viewBox="0 0 24 24"
   333|                              fill="none"
   334|                              stroke="currentColor"
   335|                              strokeWidth={2}
   336|                            >
   337|                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
   338|                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
   339|                            </svg>
   340|                            Copy
   341|                          </>
   342|                        )}
   343|                      </Button>
   344|                    )}
   345|                    {!generated[q.id] && (
   346|                      <Button
   347|                        variant="outline"
   348|                        size="sm"
   349|                        onClick={() => generateAnswer(q.id, q.question, q.max_length)}
   350|                        disabled={generating[q.id]}
   351|                      >
   352|                        {generating[q.id] ? (
   353|                          <>
   354|                            <svg
   355|                              className="animate-spin h-4 w-4 mr-2"
   356|                              xmlns="http://www.w3.org/2000/svg"
   357|                              fill="none"
   358|                              viewBox="0 0 24 24"
   359|                            >
   360|                              <circle
   361|                                className="opacity-25"
   362|                                cx="12"
   363|                                cy="12"
   364|                                r="10"
   365|                                stroke="currentColor"
   366|                                strokeWidth="4"
   367|                              />
   368|                              <path
   369|                                className="opacity-75"
   370|                                fill="currentColor"
   371|                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
   372|                              />
   373|                            </svg>
   374|                            Generating...
   375|                          </>
   376|                        ) : (
   377|                          <>
   378|                            <svg
   379|                              xmlns="http://www.w3.org/2000/svg"
   380|                              className="h-4 w-4 mr-2"
   381|                              viewBox="0 0 24 24"
   382|                              fill="none"
   383|                              stroke="currentColor"
   384|                              strokeWidth={2}
   385|                            >
   386|                              <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
   387|                            </svg>
   388|                            Generate with AI
   389|                          </>
   390|                        )}
   391|                      </Button>
   392|                    )}
   393|                    {generated[q.id] && (
   394|                      <Badge variant="secondary" className="bg-green-100 text-green-800">
   395|                        <svg
   396|                          xmlns="http://www.w3.org/2000/svg"
   397|                          className="h-3 w-3 mr-1"
   398|                          viewBox="0 0 24 24"
   399|                          fill="none"
   400|                          stroke="currentColor"
   401|                          strokeWidth={3}
   402|                        >
   403|                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
   404|                        </svg>
   405|                        Generated
   406|                      </Badge>
   407|                    )}
   408|                  </div>
   409|                </div>
   410|              </CardHeader>
   411|              <CardContent>
   412|                <Textarea
   413|                  placeholder={generating[q.id] ? 'AI is generating your answer...' : 'Click "Generate with AI" or type your answer...'}
   414|                  value={answers[q.id] || ''}
   415|                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
   416|                  onBlur={() => handleAnswerBlur(q.id)}
   417|                  className="min-h-[200px] font-mono text-sm"
   418|                />
   419|                {errors[q.id] && (
   420|                  <p className="text-sm text-red-600 mt-2">
   421|                    {errors[q.id]} - Click &quot;Generate with AI&quot; to retry
   422|                  </p>
   423|                )}
   424|                {answers[q.id] && (
   425|                  <p className="text-xs text-muted-foreground mt-2">
   426|                    {answers[q.id].length} characters
   427|                    {q.max_length && ` / ${q.max_length} max`}
   428|                  </p>
   429|                )}
   430|              </CardContent>
   431|            </Card>
   432|          ))
   433|        ) : (
   434|          <Card>
   435|            <CardContent className="py-12 text-center">
   436|              <p className="text-muted-foreground">
   437|                No application questions defined for this grant.
   438|              </p>
   439|            </CardContent>
   440|          </Card>
   441|        )}
   442|      </div>
   443|
   444|      {/* Actions */}
   445|      {questions && questions.length > 0 && (
   446|        <div className="flex gap-4 pt-4 border-t">
   447|          <Button variant="outline" className="flex-1">
   448|            Save as Draft
   449|          </Button>
   450|          <Button asChild className="flex-1">
   451|            <a href={grant.url} target="_blank" rel="noopener noreferrer">
   452|              <svg
   453|                xmlns="http://www.w3.org/2000/svg"
   454|                className="h-4 w-4 mr-2"
   455|                viewBox="0 0 24 24"
   456|                fill="none"
   457|                stroke="currentColor"
   458|                strokeWidth={2}
   459|              >
   460|                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
   461|                <polyline points="15 3 21 3 21 9" />
   462|                <line x1="10" x2="21" y1="14" y2="3" />
   463|              </svg>
   464|              Open Application Portal
   465|            </a>
   466|          </Button>
   467|        </div>
   468|      )}
   469|    </div>
   470|  );
   471|}
   472|