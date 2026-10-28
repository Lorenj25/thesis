import { Instructor, Lobby, Submission, Theme } from '../types';

const THEME_KEY = 'codeauthentic_theme';
const INSTRUCTOR_KEY = 'codeauthentic_instructor';
const LOBBIES_KEY = 'codeauthentic_lobbies';
const SUBMISSIONS_KEY = 'codeauthentic_submissions';

export const DEFAULT_INSTRUCTOR: Instructor = {
  idNumber: 'INS-2024-CCIS',
  email: 'instructor@carsu.edu.ph',
  name: 'Prof. L. Buslon',
};

// Realistic sample codes for demonstration and testing
export const SAMPLE_CODES = {
  python_ai: `# Function to perform Binary Search on a sorted array
# Time Complexity: O(log n)
# Space Complexity: O(1)
def binary_search(arr, target):
    """
    Searches for target in sorted array arr.
    Returns index if found, else -1.
    """
    left = 0
    right = len(arr) - 1
    
    while left <= right:
        mid = left + (right - left) // 2
        
        # Check if target is present at mid
        if arr[mid] == target:
            return mid
        # If target greater, ignore left half
        elif arr[mid] < target:
            left = mid + 1
        # If target is smaller, ignore right half
        else:
            right = mid - 1
            
    return -1

# Driver test execution
if __name__ == "__main__":
    test_data = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
    result = binary_search(test_data, 23)
    print("Element found at index:", result)
`,
  python_human: `# my lab exam 1 - search
def searchNum(my_list, x):
    # loop through all items
    pos = -1
    for i in range(len(my_list)):
        if my_list[i] == x:
            pos = i
            break
    print("test search done")
    return pos

nums = [10, 40, 20, 50, 30]
val = 50
ans = searchNum(nums, val)
print(f"found at: {ans}")
`,
  c_ai: `/*
 * Matrix Multiplication Algorithm
 * Generates the product of two NxN matrices
 */
#include <stdio.h>
#include <stdlib.h>

#define N 3

void multiply_matrices(int A[N][N], int B[N][N], int C[N][N]) {
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            C[i][j] = 0;
            for (int k = 0; k < N; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
}

int main() {
    int A[N][N] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int B[N][N] = {{9, 8, 7}, {6, 5, 4}, {3, 2, 1}};
    int C[N][N];

    multiply_matrices(A, B, C);
    printf("Matrix multiplication complete.\\n");
    return 0;
}
`,
  java_human: `// Student ID: 221
// CS111 Lab Exam
import java.util.Scanner;

public class StudentScoreCalculator {
    public static void main(String[] args) {
        Scanner scan = new Scanner(System.in);
        int[] scores = new int[3];
        int sum = 0;
        
        System.out.println("Enter 3 exam scores:");
        for(int i = 0; i < 3; i++) {
            scores[i] = scan.nextInt();
            sum = sum + scores[i];
        }
        
        double avg = (double) sum / 3;
        System.out.println("Final Average: " + avg);
        if(avg >= 75.0) {
            System.out.println("Status: PASSED");
        } else {
            System.out.println("Status: FAILED");
        }
    }
}
`
};

export const SEED_LOBBIES: Lobby[] = [
  {
    id: 'lobby-ccis-101',
    code: 'CARSU-1',
    subject: 'CS 111: Computer Programming 1',
    title: 'Midterm Practical Exam - Lab A',
    instructorId: 'INS-2024-CCIS',
    instructorEmail: 'instructor@carsu.edu.ph',
    maxStudents: 35,
    durationMinutes: 120,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 85 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    maxUploadsPerStudent: 3,
  },
  {
    id: 'lobby-ccis-202',
    code: 'ALGO-99',
    subject: 'IT 212: Data Structures & Algorithms',
    title: 'Laboratory Assessment 2 (Sorting & Searching)',
    instructorId: 'INS-2024-CCIS',
    instructorEmail: 'instructor@carsu.edu.ph',
    maxStudents: 40,
    durationMinutes: 90,
    createdAt: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: 'LOCKED',
    maxUploadsPerStudent: 3,
  },
];

export const SEED_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-1',
    lobbyId: 'lobby-ccis-101',
    studentId: '221-0045',
    fileName: 'binary_search.py',
    language: 'python',
    sourceCode: SAMPLE_CODES.python_ai,
    status: 'done',
    aiProbability: 0.884,
    riskLevel: 'High',
    tokenCount: 168,
    indicators: ['Textbook algorithmic explanation & structured comments', 'Standardized canonical variable naming pattern'],
    submittedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-2',
    lobbyId: 'lobby-ccis-101',
    studentId: '222-1089',
    fileName: 'searchNum.py',
    language: 'python',
    sourceCode: SAMPLE_CODES.python_human,
    status: 'done',
    aiProbability: 0.128,
    riskLevel: 'Low',
    tokenCount: 94,
    indicators: ['Personal manual debugging prints or informal notes', 'Natural human programming entropy and personalized styling'],
    submittedAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-3',
    lobbyId: 'lobby-ccis-101',
    studentId: '223-0492',
    fileName: 'matrix_mult.c',
    language: 'c',
    sourceCode: SAMPLE_CODES.c_ai,
    status: 'done',
    aiProbability: 0.742,
    riskLevel: 'High',
    tokenCount: 142,
    indicators: ['Low CodeBERT perplexity with textbook structural symmetry'],
    submittedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-4',
    lobbyId: 'lobby-ccis-101',
    studentId: '224-0071',
    fileName: 'ScoreCalculator.java',
    language: 'java',
    sourceCode: SAMPLE_CODES.java_human,
    status: 'done',
    aiProbability: 0.215,
    riskLevel: 'Low',
    tokenCount: 125,
    indicators: ['Natural human programming entropy and personalized styling'],
    submittedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'sub-5',
    lobbyId: 'lobby-ccis-101',
    studentId: '225-0318',
    fileName: 'stack_operations.c',
    language: 'c',
    sourceCode: `#include <stdio.h>\n#define MAX 10\nint stack[MAX]; int top = -1;\nvoid push(int x) { if(top < MAX-1) stack[++top] = x; }\nint pop() { if(top >= 0) return stack[top--]; return -1; }\nint main() { push(5); push(10); printf("Popped: %d\\n", pop()); return 0; }`,
    status: 'done',
    aiProbability: 0.540,
    riskLevel: 'Medium',
    tokenCount: 88,
    indicators: ['Mixed human-AI syntax and partial template scaffolding'],
    submittedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];

export function getStoredTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  return (saved === 'light' || saved === 'dark') ? saved : 'dark';
}

export function saveStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function getStoredInstructor(): Instructor | null {
  const data = localStorage.getItem(INSTRUCTOR_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveStoredInstructor(instructor: Instructor | null): void {
  if (instructor) {
    localStorage.setItem(INSTRUCTOR_KEY, JSON.stringify(instructor));
  } else {
    localStorage.removeItem(INSTRUCTOR_KEY);
  }
}

export function getStoredLobbies(): Lobby[] {
  const data = localStorage.getItem(LOBBIES_KEY);
  if (!data) {
    saveStoredLobbies(SEED_LOBBIES);
    return SEED_LOBBIES;
  }
  try {
    const list: Lobby[] = JSON.parse(data);
    // Check auto-expiry on fetch
    const now = new Date().toISOString();
    return list.map(l => {
      if (l.status === 'ACTIVE' && now > l.expiresAt) {
        return { ...l, status: 'LOCKED' };
      }
      return l;
    });
  } catch {
    return SEED_LOBBIES;
  }
}

export function saveStoredLobbies(lobbies: Lobby[]): void {
  localStorage.setItem(LOBBIES_KEY, JSON.stringify(lobbies));
}

export function getStoredSubmissions(): Submission[] {
  const data = localStorage.getItem(SUBMISSIONS_KEY);
  if (!data) {
    saveStoredSubmissions(SEED_SUBMISSIONS);
    return SEED_SUBMISSIONS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return SEED_SUBMISSIONS;
  }
}

export function saveStoredSubmissions(submissions: Submission[]): void {
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}
