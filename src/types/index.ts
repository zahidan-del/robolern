export type Role = 'admin' | 'guru' | 'murid';
export type SchoolLevel = 'SD' | 'SMP' | 'SMA/SMK' | 'Kuliah';
export type TeacherStatus = 'pending' | 'active' | 'suspended';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  avatar_position?: string | null;
  avatar_scale?: number | null;
  school_level: SchoolLevel | null;
  school_name: string | null;
  subject: string | null;
  teaching_levels: SchoolLevel[] | null;
  status: TeacherStatus | 'active';
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  level: SchoolLevel;
  thumbnail_url: string | null;
  thumbnail_position: string | null;
  thumbnail_scale?: number | null;
  teacher_id: string;
  enrollment_code: string;
  is_published: boolean;
  created_at: string;
  teacher?: Profile;
  modules?: Module[];
  enrollments?: Enrollment[];
  _count?: {
    enrollments: number;
    lessons: number;
  };
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  student?: Profile;
  course?: Course;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  file_url: string | null;
  order_index: number;
  duration_minutes: number | null;
  has_assignment: boolean;
  assignment_desc: string | null;
  assignment_deadline: string | null;
  assignment_allow_late: boolean;
  created_at: string;
  quiz?: Quiz;
  progress?: LessonProgress;
  submissions?: LessonSubmission[];
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  questions?: Question[];
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  order_index: number;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  answers: Record<string, string>;
  attempted_at: string;
}

export interface Announcement {
  id: string;
  author_id: string;
  title: string;
  content: string;
  target_level: SchoolLevel[] | null;
  created_at: string;
  author?: Profile;
}

export interface LessonSubmission {
  id: string;
  lesson_id: string;
  student_id: string;
  file_url: string;
  submitted_at: string;
  is_late: boolean;
  student?: Profile;
}
