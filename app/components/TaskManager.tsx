'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const STORAGE_KEY = 'daily-task-schedule-v1';

const todayISO = () => new Date().toISOString().split('T')[0];

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const priorities = [
  { value: 'high', label: 'عالية', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'medium', label: 'متوسطة', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'low', label: 'منخفضة', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
] as const;

type Priority = (typeof priorities)[number]['value'];

type Status = 'pending' | 'in-progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
  priority: Priority;
  status: Status;
  notes?: string;
}

const statusLabels: Record<Status, string> = {
  pending: 'لم تبدأ',
  'in-progress': 'قيد التنفيذ',
  done: 'مكتملة',
};

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(dateString: string) {
  const formatter = new Intl.DateTimeFormat('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const date = new Date(dateString + 'T00:00:00');
  return formatter.format(date);
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'all'>('day');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    startTime: '',
    endTime: '',
    priority: 'medium' as Priority,
    date: todayISO(),
    notes: '',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Task[] = JSON.parse(stored);
        setTasks(parsed);
      }
    } catch (error) {
      console.error('تعذر تحميل المهام من التخزين المحلي', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const upcomingWeekDates = useMemo(() => {
    const base = new Date(selectedDate + 'T00:00:00');
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date.toISOString().split('T')[0];
    });
  }, [selectedDate]);

  const filteredTasks = useMemo(() => {
    if (viewMode === 'all') {
      return tasks;
    }

    if (viewMode === 'week') {
      return tasks.filter(task => upcomingWeekDates.includes(task.date));
    }

    return tasks.filter(task => task.date === selectedDate);
  }, [tasks, selectedDate, viewMode, upcomingWeekDates]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();
    filteredTasks.forEach(task => {
      if (!groups.has(task.date)) {
        groups.set(task.date, []);
      }

      groups.get(task.date)?.push(task);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, items]) => ({
        date,
        items: items.sort((t1, t2) => t1.startTime.localeCompare(t2.startTime)),
      }));
  }, [filteredTasks]);

  function resetForm() {
    setForm({
      title: '',
      description: '',
      category: '',
      startTime: '',
      endTime: '',
      priority: 'medium',
      date: selectedDate,
      notes: '',
    });
    setActiveTask(null);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal(task: Task) {
    setActiveTask(task);
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      startTime: task.startTime,
      endTime: task.endTime,
      priority: task.priority,
      date: task.date,
      notes: task.notes ?? '',
    });
    setIsModalOpen(true);
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      return;
    }

    const payload: Task = {
      id: activeTask?.id ?? generateId(),
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      priority: form.priority,
      date: form.date,
      status: activeTask?.status ?? 'pending',
      notes: form.notes.trim() || undefined,
    };

    setTasks(prev => {
      if (activeTask) {
        return prev.map(task => (task.id === activeTask.id ? payload : task));
      }
      return [...prev, payload];
    });

    setIsModalOpen(false);
    resetForm();
  }

  function updateStatus(taskId: string, status: Status) {
    setTasks(prev => prev.map(task => (task.id === taskId ? { ...task, status } : task)));
  }

  function deleteTask(taskId: string) {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  }

  const today = todayISO();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">مرحبا بك</p>
            <h1 className="text-3xl font-semibold text-slate-900">جدول المهام اليومية</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-white transition hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5" />
            إضافة مهمة
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">تاريخ اليوم</p>
            <p className="text-lg font-semibold text-slate-900">{formatDate(today)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">عدد مهام اليوم</p>
            <p className="text-lg font-semibold text-slate-900">
              {tasks.filter(task => task.date === today).length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">نسبة الإنجاز هذا الأسبوع</p>
            <p className="text-lg font-semibold text-slate-900">
              {(() => {
                const weekTasks = tasks.filter(task => upcomingWeekDates.includes(task.date));
                if (weekTasks.length === 0) return '0%';
                const doneCount = weekTasks.filter(task => task.status === 'done').length;
                return `${Math.round((doneCount / weekTasks.length) * 100)}%`;
              })()}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'all'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'rounded-full border px-4 py-2 text-sm transition',
                  viewMode === mode
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200 hover:text-primary-700'
                )}
              >
                {mode === 'day' && 'عرض اليوم'}
                {mode === 'week' && 'عرض الأسبوع'}
                {mode === 'all' && 'كل المهام'}
              </button>
            ))}
          </div>
          {viewMode !== 'all' && (
            <input
              type="date"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none"
              value={selectedDate}
              onChange={event => setSelectedDate(event.target.value)}
            />
          )}
        </div>

        <div className="mt-6 space-y-6">
          {groupedTasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
              لا توجد مهام بعد. اضغط على زر "إضافة مهمة" للبدء.
            </div>
          )}

          {groupedTasks.map(group => (
            <div key={group.date} className="fade-in space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm text-slate-500">{group.items.length} مهمة</p>
                  <h2 className="text-xl font-semibold text-slate-900">{formatDate(group.date)}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {daysOfWeek[new Date(group.date + 'T00:00:00').getDay()]}
                </span>
              </div>

              <div className="grid gap-3">
                {group.items.map(task => (
                  <article
                    key={task.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:flex-row md:items-center"
                  >
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold',
                            priorities.find(priority => priority.value === task.priority)?.color
                          )}
                        >
                          {task.category || 'بدون تصنيف'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {task.startTime} - {task.endTime || '---'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-slate-500">{task.description}</p>
                        )}
                      </div>
                      {task.notes && (
                        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{task.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-stretch gap-2 md:w-48">
                      <select
                        value={task.status}
                        onChange={event => updateStatus(task.id, event.target.value as Status)}
                        className="rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-primary-500 focus:outline-none"
                      >
                        <option value="pending">{statusLabels.pending}</option>
                        <option value="in-progress">{statusLabels['in-progress']}</option>
                        <option value="done">{statusLabels.done}</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(task)}
                          className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-primary-200 hover:text-primary-600"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-6 shadow-xl transition-all">
                  <div className="flex items-start justify-between">
                    <Dialog.Title className="text-2xl font-semibold text-slate-900">
                      {activeTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
                    </Dialog.Title>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                      عنوان المهمة
                      <input
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        value={form.title}
                        onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                        placeholder="مثال: مراجعة البريد الإلكتروني"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                      التصنيف
                      <input
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        value={form.category}
                        onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))}
                        placeholder="مثال: عمل / شخصي"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
                      الوصف
                      <textarea
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        rows={3}
                        value={form.description}
                        onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
                        placeholder="تفاصيل إضافية حول المهمة"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                      التاريخ
                      <input
                        type="date"
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        value={form.date}
                        onChange={event => setForm(prev => ({ ...prev, date: event.target.value }))}
                      />
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
                        بداية المهمة
                        <input
                          type="time"
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                          value={form.startTime}
                          onChange={event => setForm(prev => ({ ...prev, startTime: event.target.value }))}
                        />
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
                        نهاية المهمة
                        <input
                          type="time"
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                          value={form.endTime}
                          onChange={event => setForm(prev => ({ ...prev, endTime: event.target.value }))}
                        />
                      </label>
                    </div>
                    <label className="flex flex-col gap-1 text-sm text-slate-600">
                      الأولوية
                      <select
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        value={form.priority}
                        onChange={event => setForm(prev => ({ ...prev, priority: event.target.value as Priority }))}
                      >
                        {priorities.map(priority => (
                          <option key={priority.value} value={priority.value}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-slate-600 md:col-span-2">
                      ملاحظات إضافية
                      <textarea
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                        rows={3}
                        value={form.notes}
                        onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
                        placeholder="أكتب أي ملاحظات أو أفكار مرتبطة بالمهمة"
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        resetForm();
                      }}
                      className="rounded-full border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:border-slate-300"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSubmit}
                      className="rounded-full bg-primary-600 px-5 py-2 text-sm text-white transition hover:bg-primary-700"
                    >
                      حفظ المهمة
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
